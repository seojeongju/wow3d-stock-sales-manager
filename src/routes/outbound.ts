import { Hono } from 'hono'
import type { Bindings, OutboundOrder, CreateOutboundRequest, PickingRequest, PackingRequest } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 출고 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const status = c.req.query('status')

    let query = `
    SELECT o.*, 
           (SELECT COUNT(*) FROM outbound_items WHERE outbound_order_id = o.id) as item_count,
           (SELECT SUM(quantity_ordered) FROM outbound_items WHERE outbound_order_id = o.id) as total_quantity
    FROM outbound_orders o
  `
    const params: any[] = []

    if (status) {
        query += ' WHERE o.status = ?'
        params.push(status)
    }

    query += ' ORDER BY o.created_at DESC'

    const { results } = await DB.prepare(query).bind(...params).all<OutboundOrder>()

    return c.json({ success: true, data: results })
})

// 출고 상세 조회
app.get('/:id', async (c) => {
    const { DB } = c.env
    const id = c.req.param('id')

    const order = await DB.prepare('SELECT * FROM outbound_orders WHERE id = ?').bind(id).first<OutboundOrder>()

    if (!order) {
        return c.json({ success: false, error: '출고 지시서를 찾을 수 없습니다.' }, 404)
    }

    const items = await DB.prepare(`
    SELECT oi.*, p.name as product_name, p.sku 
    FROM outbound_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.outbound_order_id = ?
  `).bind(id).all()

    const packages = await DB.prepare('SELECT * FROM outbound_packages WHERE outbound_order_id = ?').bind(id).all()

    const sales = await DB.prepare(`
    SELECT s.id, s.created_at, c.name as customer_name
    FROM outbound_order_mappings om
    JOIN sales s ON om.sale_id = s.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE om.outbound_order_id = ?
  `).bind(id).all()

    return c.json({
        success: true,
        data: {
            ...order,
            items: items.results,
            packages: packages.results,
            sales: sales.results
        }
    })
})

// 1. 출고 지시 생성 (주문 -> 출고)
app.post('/create', async (c) => {
    const { DB } = c.env
    const body = await c.req.json<CreateOutboundRequest>()

    if (!body.sale_ids || body.sale_ids.length === 0) {
        return c.json({ success: false, error: '선택된 주문이 없습니다.' }, 400)
    }

    // 첫 번째 주문의 배송지 정보를 기준으로 출고 지시서 생성 (합포장 가정)
    const firstSale = await DB.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `).bind(body.sale_ids[0]).first<any>()

    if (!firstSale) {
        return c.json({ success: false, error: '주문 정보를 찾을 수 없습니다.' }, 404)
    }

    const orderNumber = `DO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`

    try {
        // 트랜잭션 시작 (D1은 batch로 처리)
        const statements = []

        // 1. 출고 지시서 생성
        const insertOrder = DB.prepare(`
      INSERT INTO outbound_orders (order_number, destination_name, destination_address, destination_phone, status, notes)
      VALUES (?, ?, ?, ?, 'PENDING', ?)
    `).bind(
            orderNumber,
            firstSale.customer_name || '비회원',
            firstSale.shipping_address || '주소 미입력',
            firstSale.customer_phone || '',
            body.notes || null
        )

        // 실행하여 ID 획득 필요 -> D1은 last_row_id를 반환하지만 batch에서는 까다로움.
        // 여기서는 순차 실행으로 처리 (D1의 한계로 인해 엄격한 트랜잭션은 어려울 수 있음)
        const orderResult = await insertOrder.run()
        const orderId = orderResult.meta.last_row_id

        // 2. 주문 매핑 및 상품 집계
        for (const saleId of body.sale_ids) {
            // 매핑 추가
            await DB.prepare('INSERT INTO outbound_order_mappings (outbound_order_id, sale_id) VALUES (?, ?)').bind(orderId, saleId).run()

            // 주문 상태 변경 (배송 준비중)
            await DB.prepare("UPDATE sales SET status = 'pending_shipment' WHERE id = ?").bind(saleId).run()

            // 주문 상품 조회
            const { results: saleItems } = await DB.prepare('SELECT * FROM sale_items WHERE sale_id = ?').bind(saleId).all<any>()

            for (const item of saleItems) {
                // 이미 같은 상품이 있는지 확인 (합포장 시 수량 합산)
                const existingItem = await DB.prepare('SELECT id, quantity_ordered FROM outbound_items WHERE outbound_order_id = ? AND product_id = ?')
                    .bind(orderId, item.product_id).first<any>()

                if (existingItem) {
                    await DB.prepare('UPDATE outbound_items SET quantity_ordered = quantity_ordered + ? WHERE id = ?')
                        .bind(item.quantity, existingItem.id).run()
                } else {
                    await DB.prepare('INSERT INTO outbound_items (outbound_order_id, product_id, quantity_ordered) VALUES (?, ?, ?)')
                        .bind(orderId, item.product_id, item.quantity).run()
                }
            }
        }

        return c.json({ success: true, message: '출고 지시가 생성되었습니다.', data: { id: orderId } })

    } catch (e) {
        return c.json({ success: false, error: '출고 지시 생성 중 오류가 발생했습니다: ' + e.message }, 500)
    }
})

// 2. 피킹 처리 (검수)
app.post('/:id/picking', async (c) => {
    const { DB } = c.env
    const id = c.req.param('id')
    const body = await c.req.json<PickingRequest>()

    // 피킹 수량 업데이트
    for (const item of body.items) {
        await DB.prepare(`
      UPDATE outbound_items 
      SET quantity_picked = quantity_picked + ?, 
          status = CASE WHEN quantity_picked + ? >= quantity_ordered THEN 'PICKED' ELSE 'PENDING' END
      WHERE outbound_order_id = ? AND product_id = ?
    `).bind(item.quantity, item.quantity, id, item.product_id).run()
    }

    // 모든 아이템이 피킹되었는지 확인
    const unpickedItems = await DB.prepare(`
    SELECT COUNT(*) as count FROM outbound_items 
    WHERE outbound_order_id = ? AND quantity_picked < quantity_ordered
  `).bind(id).first<any>()

    let orderStatus = 'PICKING'
    if (unpickedItems.count === 0) {
        orderStatus = 'PACKING' // 피킹 완료 시 패킹 단계로 이동
    }

    await DB.prepare('UPDATE outbound_orders SET status = ? WHERE id = ?').bind(orderStatus, id).run()

    return c.json({ success: true, message: '피킹 정보가 업데이트되었습니다.' })
})

// 3. 패킹 및 송장 입력
app.post('/:id/packing', async (c) => {
    const { DB } = c.env
    const id = c.req.param('id')
    const body = await c.req.json<PackingRequest>()

    // 패키지 정보 저장
    await DB.prepare(`
    INSERT INTO outbound_packages (outbound_order_id, tracking_number, courier, box_type, box_count, weight)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, body.tracking_number, body.courier, body.box_type, body.box_count, body.weight).run()

    // 모든 아이템 패킹 처리 (간소화를 위해 일괄 처리)
    await DB.prepare('UPDATE outbound_items SET quantity_packed = quantity_picked, status = "PACKED" WHERE outbound_order_id = ?').bind(id).run()

    await DB.prepare('UPDATE outbound_orders SET status = "PACKING" WHERE id = ?').bind(id).run()

    return c.json({ success: true, message: '패킹 정보가 저장되었습니다.' })
})

// 4. 출고 확정 (재고 차감)
app.post('/:id/confirm', async (c) => {
    const { DB } = c.env
    const id = c.req.param('id')

    const order = await DB.prepare('SELECT * FROM outbound_orders WHERE id = ?').bind(id).first<OutboundOrder>()
    if (!order) return c.json({ success: false, error: '주문을 찾을 수 없습니다.' }, 404)

    if (order.status === 'SHIPPED') {
        return c.json({ success: false, error: '이미 출고 완료된 주문입니다.' }, 400)
    }

    // 출고 아이템 조회
    const { results: items } = await DB.prepare('SELECT * FROM outbound_items WHERE outbound_order_id = ?').bind(id).all<any>()

    // 재고 차감 (FIFO 로직 적용)
    for (const item of items) {
        let remainingToDeduct = item.quantity_packed

        // 1. stock_lots에서 오래된 순으로 차감
        const { results: lots } = await DB.prepare(`
      SELECT * FROM stock_lots 
      WHERE product_id = ? AND remaining_quantity > 0 
      ORDER BY created_at ASC
    `).bind(item.product_id).all<any>()

        for (const lot of lots) {
            if (remainingToDeduct <= 0) break

            const deductAmount = Math.min(lot.remaining_quantity, remainingToDeduct)

            await DB.prepare('UPDATE stock_lots SET remaining_quantity = remaining_quantity - ? WHERE id = ?')
                .bind(deductAmount, lot.id).run()

            remainingToDeduct -= deductAmount
        }

        // 2. products 테이블 총 재고 차감
        await DB.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?')
            .bind(item.quantity_packed, item.product_id).run()

        // 3. 재고 이동 기록 (OUT)
        await DB.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reason, reference_id)
      VALUES (?, '출고', ?, '출고 확정', ?)
    `).bind(item.product_id, item.quantity_packed, id).run()
    }

    // 상태 업데이트
    await DB.prepare('UPDATE outbound_orders SET status = "SHIPPED", updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run()

    // 연결된 판매 주문 상태 업데이트
    const { results: mappings } = await DB.prepare('SELECT sale_id FROM outbound_order_mappings WHERE outbound_order_id = ?').bind(id).all<any>()
    for (const map of mappings) {
        // 송장 번호 업데이트 (첫 번째 패키지 기준)
        const pkg = await DB.prepare('SELECT * FROM outbound_packages WHERE outbound_order_id = ?').bind(id).first<any>()

        let updateQuery = "UPDATE sales SET status = 'shipped'"
        const params = []
        if (pkg) {
            updateQuery += ", tracking_number = ?, courier = ?"
            params.push(pkg.tracking_number, pkg.courier)
        }
        updateQuery += " WHERE id = ?"
        params.push(map.sale_id)

        await DB.prepare(updateQuery).bind(...params).run()
    }

    return c.json({ success: true, message: '출고가 확정되었습니다.' })
})

export default app
