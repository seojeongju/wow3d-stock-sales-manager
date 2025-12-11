import { Hono } from 'hono'
import type { Bindings, Variables, OutboundOrder, CreateOutboundRequest, PickingRequest, PackingRequest } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 출고 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const status = c.req.query('status')
    const search = c.req.query('search')
    const startDate = c.req.query('start_date')
    const endDate = c.req.query('end_date')
    const courier = c.req.query('courier')

    let query = `
    SELECT o.*, 
           (SELECT COUNT(*) FROM outbound_items WHERE outbound_order_id = o.id) as item_count,
           (SELECT SUM(quantity_ordered) FROM outbound_items WHERE outbound_order_id = o.id) as total_quantity,
           u.name as created_by_name,
           (SELECT p.name FROM outbound_items oi JOIN products p ON oi.product_id = p.id WHERE oi.outbound_order_id = o.id LIMIT 1) as first_product_name,
           (SELECT tracking_number FROM outbound_packages WHERE outbound_order_id = o.id LIMIT 1) as tracking_number,
           (SELECT courier FROM outbound_packages WHERE outbound_order_id = o.id LIMIT 1) as courier_name
    FROM outbound_orders o
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.tenant_id = ?
  `
    const params: any[] = [tenantId]

    if (status) {
        query += ' AND o.status = ?'
        params.push(status)
    }

    if (search) {
        query += ' AND (o.order_number LIKE ? OR o.destination_name LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
    }

    if (startDate) {
        query += ' AND DATE(o.created_at) >= ?'
        params.push(startDate)
    }

    if (endDate) {
        query += ' AND DATE(o.created_at) <= ?'
        params.push(endDate)
    }

    if (courier) {
        query += ' AND EXISTS (SELECT 1 FROM outbound_packages op WHERE op.outbound_order_id = o.id AND op.courier = ?)'
        params.push(courier)
    }

    query += ' ORDER BY o.created_at DESC'

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM outbound_orders o WHERE o.tenant_id = ?` +
        (status ? ' AND o.status = ?' : '') +
        (search ? ' AND (o.order_number LIKE ? OR o.destination_name LIKE ?)' : '') +
        (startDate ? ' AND DATE(o.created_at) >= ?' : '') +
        (endDate ? ' AND DATE(o.created_at) <= ?' : '') +
        (courier ? ' AND EXISTS (SELECT 1 FROM outbound_packages op WHERE op.outbound_order_id = o.id AND op.courier = ?)' : '')

    const countParams: any[] = [tenantId]
    if (status) countParams.push(status)
    if (search) countParams.push(`%${search}%`, `%${search}%`)
    if (startDate) countParams.push(startDate)
    if (endDate) countParams.push(endDate)
    if (courier) countParams.push(courier)

    const countResult = await DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()
    const total = countResult?.total || 0

    // Pagination
    let limit = parseInt(c.req.query('limit') || '0')
    const offset = parseInt(c.req.query('offset') || '0')

    // 기본값 10개 설정 (프론트엔드 캐시 문제 방지용)
    if (limit === 0) limit = 10

    if (limit > 0) {
        query += ' LIMIT ? OFFSET ?'
        params.push(limit, offset)
    }

    const { results } = await DB.prepare(query).bind(...params).all<OutboundOrder>()

    return c.json({
        success: true,
        data: results,
        pagination: {
            total,
            limit: limit > 0 ? limit : total,
            offset,
            hasMore: offset + (limit > 0 ? limit : total) < total
        }
    })
})

// 출고 상세 조회
app.get('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    const order = await DB.prepare(`
    SELECT o.*, u.name as created_by_name
    FROM outbound_orders o
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.id = ? AND o.tenant_id = ?
  `).bind(id, tenantId).first<OutboundOrder>()

    if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404)
    }

    const { results: items } = await DB.prepare(`
    SELECT oi.*, p.name as product_name, p.sku
    FROM outbound_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.outbound_order_id = ?
  `).bind(id).all()

    const { results: packages } = await DB.prepare(`
    SELECT * FROM outbound_packages WHERE outbound_order_id = ?
  `).bind(id).all()

    return c.json({
        success: true,
        data: {
            ...order,
            items,
            packages
        }
    })
})

// 간편 출고 등록 (단일 상품 + 즉시 출고 완료)
app.post('/direct', async (c) => {
    const { DB } = c.env;
    const tenantId = c.get('tenantId');
    const userId = c.get('userId'); // tenant middleware에서 설정됨
    const body = await c.req.json();

    // 입력값 검증
    if (!body.items || body.items.length === 0) {
        return c.json({ success: false, error: 'At least one item is required' }, 400);
    }

    const orderDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `DO-${orderDate}-${randomSuffix}`;

    try {
        // 트랜잭션 대신 순차 처리 (D1은 트랜잭션 지원이 제한적일 수 있음, batch 사용 가능하나 복잡)
        // 1. outbound_orders 생성 (SHIPPED 상태)
        const orderResult = await DB.prepare(`
      INSERT INTO outbound_orders (
        tenant_id, order_number, destination_name, destination_address, destination_phone, 
        status, created_by, notes, purchase_path
      ) VALUES (?, ?, ?, ?, ?, 'SHIPPED', ?, ?, ?)
    `).bind(
            tenantId, orderNumber, body.recipient, body.address, body.phone,
            userId, body.memo, body.purchasePath
        ).run();

        const orderId = orderResult.meta.last_row_id;

        // 2. outbound_items 등록 및 재고 차감
        // 중복 상품 ID 합치기
        const mergedItems = new Map<number, number>();
        for (const item of body.items) {
            const currentQty = mergedItems.get(item.productId) || 0;
            mergedItems.set(item.productId, currentQty + item.quantity);
        }

        for (const [productId, quantity] of mergedItems.entries()) {
            // 재고 확인
            const product = await DB.prepare('SELECT current_stock FROM products WHERE id = ? AND tenant_id = ?')
                .bind(productId, tenantId)
                .first<{ current_stock: number }>();

            if (!product) {
                throw new Error(`Product ${productId} not found`);
            }
            if (product.current_stock < quantity) {
                throw new Error(`Insufficient stock for product ${productId}`);
            }

            // 아이템 등록
            await DB.prepare(`
        INSERT INTO outbound_items (
            outbound_order_id, product_id, quantity_ordered
        ) VALUES (?, ?, ?)
         `).bind(orderId, productId, quantity).run();

            // 재고 차감
            await DB.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?')
                .bind(quantity, productId).run();
        }

        // 3. outbound_packages 등록 (운송장 번호가 있는 경우)
        if (body.courier && body.trackingNumber) {
            await DB.prepare(`
        INSERT INTO outbound_packages (
          outbound_order_id, courier, tracking_number
        ) VALUES (?, ?, ?)
      `).bind(orderId, body.courier, body.trackingNumber).run();
        }

        return c.json({ success: true, orderId });

    } catch (e: any) {
        console.error('Direct outbound error:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// 출고 수정 (배송 정보 등)
app.put('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json()

    // 존재 여부 확인
    const exists = await DB.prepare('SELECT id FROM outbound_orders WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId).first()

    if (!exists) {
        return c.json({ success: false, error: 'Order not found' }, 404)
    }

    try {
        // 기본 정보 업데이트
        await DB.prepare(`
            UPDATE outbound_orders 
            SET destination_name = COALESCE(?, destination_name),
                destination_phone = COALESCE(?, destination_phone),
                destination_address = COALESCE(?, destination_address),
                notes = COALESCE(?, notes),
                purchase_path = COALESCE(?, purchase_path)
            WHERE id = ?
        `).bind(
            body.destination_name,
            body.destination_phone,
            body.destination_address,
            body.notes,
            body.purchase_path,
            id
        ).run()

        // 운송장 정보 업데이트 (패키지가 있으면 업데이트, 없으면 생성)
        if (body.courier || body.tracking_number) {
            const pkg = await DB.prepare('SELECT id FROM outbound_packages WHERE outbound_order_id = ?').bind(id).first()

            if (pkg) {
                await DB.prepare(`
                    UPDATE outbound_packages 
                    SET courier = COALESCE(?, courier), 
                        tracking_number = COALESCE(?, tracking_number)
                    WHERE id = ?
                `).bind(body.courier, body.tracking_number, pkg.id).run()
            } else if (body.courier && body.tracking_number) {
                await DB.prepare(`
                    INSERT INTO outbound_packages (outbound_order_id, courier, tracking_number)
                    VALUES (?, ?, ?)
                `).bind(id, body.courier, body.tracking_number).run()
            }
        }

        return c.json({ success: true })
    } catch (e: any) {
        console.error('Update error:', e)
        return c.json({ success: false, error: e.message }, 500)
    }
})

// 출고 삭제 (재고 복구 포함)
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    // 존재 여부 확인
    const order = await DB.prepare('SELECT id, status FROM outbound_orders WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId).first<{ id: number, status: string }>()

    if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404)
    }

    try {
        // 1. 재고 복구 (SHIPPED, PACKING, PICKING 등 재고가 차감된 상태라면 복구)
        // 안심 출고의 경우 등록(Direct) 시 바로 차감되므로 무조건 복구해야 함.
        // 만약 PENDING 상태에서 차감되지 않았다면 복구하지 말아야 함.
        // 현재 로직상 PENDING은 할당을 안하므로 차감이 안됨. Direct는 바로 SHIPPED.

        // 아이템 조회
        const { results: items } = await DB.prepare(`
            SELECT product_id, quantity_ordered 
            FROM outbound_items 
            WHERE outbound_order_id = ?
        `).bind(id).all<{ product_id: number, quantity_ordered: number }>()

        if (items && items.length > 0) {
            // SHIPPED나 완료된 주문은 fulfilled 기준으로, 그 외엔 상황에 따라 다름.
            // Direct 출고는 quantity_fulfilled = quantity_ordered임.
            for (const item of items) {
                const qtyToRestore = item.quantity_ordered
                if (qtyToRestore > 0) {
                    await DB.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?')
                        .bind(qtyToRestore, item.product_id).run()
                }
            }
        }

        // 2. 관련 데이터 삭제
        await DB.prepare('DELETE FROM outbound_items WHERE outbound_order_id = ?').bind(id).run()
        await DB.prepare('DELETE FROM outbound_packages WHERE outbound_order_id = ?').bind(id).run()
        await DB.prepare('DELETE FROM outbound_order_mappings WHERE outbound_order_id = ?').bind(id).run()
        // outbound_status_history 테이블 없음 (생략)

        // 3. 주문 삭제
        await DB.prepare('DELETE FROM outbound_orders WHERE id = ?').bind(id).run()

        return c.json({ success: true })
    } catch (e: any) {
        console.error('Delete error:', e)
        return c.json({
            success: false,
            error: e.message,
            details: String(e),
            // 디버깅 차원에서 에러 객체 내부 속성도 반환
            debug: JSON.stringify(e, Object.getOwnPropertyNames(e))
        }, 500)
    }
})

export default app
