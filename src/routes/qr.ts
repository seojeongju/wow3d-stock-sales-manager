import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const qr = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ================================================
// 1. QR 코드 생성
// ================================================
qr.post('/generate', async (c) => {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')

    const { product_id, quantity = 1, batch_number, type = 'product' } = await c.req.json()

    if (!product_id) {
        return c.json({ error: '제품 ID가 필요합니다' }, 400)
    }

    if (quantity < 1 || quantity > 100) {
        return c.json({ error: '수량은 1-100 사이여야 합니다' }, 400)
    }

    try {
        const generatedCodes = []

        // 제품 정보 확인
        const product = await c.env.DB.prepare(`
      SELECT id, name, code FROM products 
      WHERE id = ? AND tenant_id = ?
    `).bind(product_id, tenantId).first()

        if (!product) {
            return c.json({ error: '제품을 찾을 수 없습니다' }, 404)
        }

        // UUID 생성을 위한 헬퍼 함수
        const generateUUID = () => {
            return 'QR-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9).toUpperCase()
        }

        // 배치로 여러 QR 코드 생성
        const batch = []
        for (let i = 0; i < quantity; i++) {
            const qrCode = generateUUID()
            const batchNum = batch_number || `BATCH-${new Date().toISOString().split('T')[0]}-${String(i + 1).padStart(3, '0')}`

            batch.push(
                c.env.DB.prepare(`
          INSERT INTO qr_codes (code, product_id, type, status, batch_number, created_by)
          VALUES (?, ?, ?, 'active', ?, ?)
        `).bind(qrCode, product_id, type, batchNum, userId)
            )

            generatedCodes.push({
                code: qrCode,
                product_id,
                batch_number: batchNum
            })
        }

        // 배치 실행
        await c.env.DB.batch(batch)

        return c.json({
            success: true,
            message: `${quantity}개의 QR 코드가 생성되었습니다`,
            codes: generatedCodes,
            product: {
                id: product.id,
                name: product.name,
                code: product.code
            }
        })
    } catch (error: any) {
        console.error('QR 코드 생성 오류:', error)
        return c.json({ error: 'QR 코드 생성 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 2. QR 코드 목록 조회
// ================================================
qr.get('/codes', async (c) => {
    const tenantId = c.get('tenantId')
    const productId = c.req.query('product_id')
    const status = c.req.query('status') || 'active'
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    try {
        let query = `
      SELECT 
        qc.id,
        qc.code,
        qc.product_id,
        qc.type,
        qc.status,
        qc.batch_number,
        qc.manufacture_date,
        qc.expiry_date,
        qc.created_at,
        p.name AS product_name,
        p.code AS product_code,
        p.quantity AS product_stock,
        u.name AS created_by_name
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      LEFT JOIN users u ON qc.created_by = u.id
      WHERE p.tenant_id = ?
    `
        const params: any[] = [tenantId]

        if (productId) {
            query += ' AND qc.product_id = ?'
            params.push(productId)
        }

        if (status) {
            query += ' AND qc.status = ?'
            params.push(status)
        }

        query += ' ORDER BY qc.created_at DESC LIMIT ? OFFSET ?'
        params.push(limit, offset)

        const { results } = await c.env.DB.prepare(query).bind(...params).all()

        // 총 개수 조회
        let countQuery = 'SELECT COUNT(*) as total FROM qr_codes qc LEFT JOIN products p ON qc.product_id = p.id WHERE p.tenant_id = ?'
        const countParams: any[] = [tenantId]

        if (productId) {
            countQuery += ' AND qc.product_id = ?'
            countParams.push(productId)
        }
        if (status) {
            countQuery += ' AND qc.status = ?'
            countParams.push(status)
        }

        const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()

        return c.json({
            success: true,
            codes: results,
            pagination: {
                total: countResult?.total || 0,
                limit,
                offset,
                hasMore: (countResult?.total || 0) > offset + limit
            }
        })
    } catch (error: any) {
        console.error('QR 코드 목록 조회 오류:', error)
        return c.json({ error: 'QR 코드 목록 조회 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 3. 특정 QR 코드 상세 조회
// ================================================
qr.get('/codes/:code', async (c) => {
    const tenantId = c.get('tenantId')
    const qrCode = c.req.param('code')

    try {
        const qrInfo = await c.env.DB.prepare(`
      SELECT 
        qc.*,
        p.name AS product_name,
        p.code AS product_code,
        p.quantity AS product_stock,
        p.price,
        u.name AS created_by_name
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      LEFT JOIN users u ON qc.created_by = u.id
      WHERE qc.code = ? AND p.tenant_id = ?
    `).bind(qrCode, tenantId).first()

        if (!qrInfo) {
            return c.json({ error: 'QR 코드를 찾을 수 없습니다' }, 404)
        }

        // 해당 QR 코드의 트랜잭션 이력 조회
        const { results: transactions } = await c.env.DB.prepare(`
      SELECT 
        qt.id,
        qt.transaction_type,
        qt.quantity,
        qt.created_at,
        w.name AS warehouse_name,
        u.name AS user_name,
        qt.notes
      FROM qr_transactions qt
      LEFT JOIN warehouses w ON qt.warehouse_id = w.id
      LEFT JOIN users u ON qt.created_by = u.id
      WHERE qt.qr_code_id = ?
      ORDER BY qt.created_at DESC
      LIMIT 20
    `).bind(qrInfo.id).all()

        return c.json({
            success: true,
            qr_code: qrInfo,
            transactions
        })
    } catch (error: any) {
        console.error('QR 코드 상세 조회 오류:', error)
        return c.json({ error: 'QR 코드 조회 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 4. QR 코드 상태 변경
// ================================================
qr.patch('/codes/:id/status', async (c) => {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const qrId = c.req.param('id')
    const { status } = await c.req.json()

    if (!['active', 'inactive', 'damaged', 'lost'].includes(status)) {
        return c.json({ error: '유효하지 않은 상태입니다' }, 400)
    }

    try {
        // QR 코드 소유권 확인
        const qr = await c.env.DB.prepare(`
      SELECT qc.id 
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE qc.id = ? AND p.tenant_id = ?
    `).bind(qrId, tenantId).first()

        if (!qr) {
            return c.json({ error: 'QR 코드를 찾을 수 없습니다' }, 404)
        }

        await c.env.DB.prepare(`
      UPDATE qr_codes 
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, userId, qrId).run()

        return c.json({
            success: true,
            message: 'QR 코드 상태가 변경되었습니다'
        })
    } catch (error: any) {
        console.error('QR 코드 상태 변경 오류:', error)
        return c.json({ error: 'QR 코드 상태 변경 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 5. QR 코드로 제품 조회 (스캔 시 사용)
// ================================================
qr.get('/scan/:code', async (c) => {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const qrCode = c.req.param('code')

    try {
        const startTime = Date.now()

        // QR 코드 정보 조회
        const qrInfo = await c.env.DB.prepare(`
      SELECT 
        qc.id AS qr_id,
        qc.code AS qr_code,
        qc.type,
        qc.status,
        qc.batch_number,
        p.id AS product_id,
        p.name AS product_name,
        p.code AS product_code,
        p.price,
        p.quantity AS current_stock,
        p.category
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE qc.code = ? AND p.tenant_id = ?
    `).bind(qrCode, tenantId).first()

        const scanDuration = Date.now() - startTime

        if (!qrInfo) {
            // 스캔 로그 (실패)
            await c.env.DB.prepare(`
        INSERT INTO qr_scan_logs (qr_code, scan_result, user_id, scan_duration_ms, error_message)
        VALUES (?, 'not_found', ?, ?, '제품을 찾을 수 없음')
      `).bind(qrCode, userId, scanDuration).run()

            return c.json({ error: '존재하지 않는 QR 코드입니다' }, 404)
        }

        if (qrInfo.status !== 'active') {
            // 스캔 로그 (비활성)
            await c.env.DB.prepare(`
        INSERT INTO qr_scan_logs (qr_code, scan_result, product_id, user_id, scan_duration_ms, error_message)
        VALUES (?, 'inactive', ?, ?, ?, ?)
      `).bind(qrCode, qrInfo.product_id, userId, scanDuration, `상태: ${qrInfo.status}`).run()

            return c.json({
                error: '비활성화된 QR 코드입니다',
                status: qrInfo.status
            }, 400)
        }

        // 스캔 로그 (성공)
        await c.env.DB.prepare(`
      INSERT INTO qr_scan_logs (qr_code, scan_result, product_id, user_id, scan_duration_ms)
      VALUES (?, 'success', ?, ?, ?)
    `).bind(qrCode, qrInfo.product_id, userId, scanDuration).run()

        return c.json({
            success: true,
            qr_code: qrInfo
        })
    } catch (error: any) {
        console.error('QR 스캔 오류:', error)
        return c.json({ error: 'QR 스캔 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 6. QR 통계 조회
// ================================================
qr.get('/stats', async (c) => {
    const tenantId = c.get('tenantId')

    try {
        // 전체 QR 코드 통계
        const qrStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) AS total_qr_codes,
        COUNT(CASE WHEN qc.status = 'active' THEN 1 END) AS active_codes,
        COUNT(CASE WHEN qc.status = 'inactive' THEN 1 END) AS inactive_codes,
        COUNT(CASE WHEN qc.status = 'damaged' THEN 1 END) AS damaged_codes
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE p.tenant_id = ?
    `).bind(tenantId).first()

        // 오늘의 트랜잭션 통계
        const today = new Date().toISOString().split('T')[0]
        const todayStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(CASE WHEN qt.transaction_type = 'inbound' THEN 1 END) AS today_inbound_count,
        COALESCE(SUM(CASE WHEN qt.transaction_type = 'inbound' THEN qt.quantity END), 0) AS today_inbound_qty,
        COUNT(CASE WHEN qt.transaction_type = 'outbound' THEN 1 END) AS today_outbound_count,
        COALESCE(SUM(CASE WHEN qt.transaction_type = 'outbound' THEN qt.quantity END), 0) AS today_outbound_qty,
        COUNT(CASE WHEN qt.transaction_type = 'sale' THEN 1 END) AS today_sale_count,
        COALESCE(SUM(CASE WHEN qt.transaction_type = 'sale' THEN qt.quantity END), 0) AS today_sale_qty
      FROM qr_transactions qt
      LEFT JOIN qr_codes qc ON qt.qr_code_id = qc.id
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE p.tenant_id = ? AND DATE(qt.created_at) = ?
    `).bind(tenantId, today).first()

        return c.json({
            success: true,
            qr_stats: qrStats,
            today_stats: todayStats
        })
    } catch (error: any) {
        console.error('QR 통계 조회 오류:', error)
        return c.json({ error: '통계 조회 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 7. QR 입고 처리
// ================================================
qr.post('/inbound', async (c) => {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')

    const { qr_code, quantity, warehouse_id, notes } = await c.req.json()

    if (!qr_code) {
        return c.json({ error: 'QR 코드가 필요합니다' }, 400)
    }

    if (!quantity || quantity < 1) {
        return c.json({ error: '올바른 수량을 입력하세요' }, 400)
    }

    if (!warehouse_id) {
        return c.json({ error: '창고를 선택하세요' }, 400)
    }

    try {
        // QR 코드 정보 조회
        const qrInfo = await c.env.DB.prepare(`
      SELECT 
        qc.id AS qr_id,
        qc.product_id,
        qc.status,
        p.name AS product_name,
        p.quantity AS current_stock
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE qc.code = ? AND p.tenant_id = ?
    `).bind(qr_code, tenantId).first()

        if (!qrInfo) {
            return c.json({ error: 'QR 코드를 찾을 수 없습니다' }, 404)
        }

        if (qrInfo.status !== 'active') {
            return c.json({ error: `비활성화된 QR 코드입니다 (상태: ${qrInfo.status})` }, 400)
        }

        // 트랜잭션으로 묶어서 처리
        const batch = []

        // 1. QR 트랜잭션 기록
        batch.push(
            c.env.DB.prepare(`
        INSERT INTO qr_transactions (qr_code_id, transaction_type, quantity, warehouse_id, created_by, notes)
        VALUES (?, 'inbound', ?, ?, ?, ?)
      `).bind(qrInfo.qr_id, quantity, warehouse_id, userId, notes || null)
        )

        // 2. 제품 재고 증가
        batch.push(
            c.env.DB.prepare(`
        UPDATE products 
        SET quantity = quantity + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(quantity, qrInfo.product_id)
        )

        // 3. 재고 이력 기록 (Stock movements 테이블에도 기록)
        batch.push(
            c.env.DB.prepare(`
        INSERT INTO stock_movements (product_id, quantity, movement_type, warehouse_id, notes, created_by)
        VALUES (?, ?, 'in', ?, ?, ?)
      `).bind(qrInfo.product_id, quantity, warehouse_id, `QR 입고: ${qr_code}${notes ? ' - ' + notes : ''}`, userId)
        )

        // 배치 실행
        await c.env.DB.batch(batch)

        // 업데이트된 재고 조회
        const updatedProduct = await c.env.DB.prepare(`
      SELECT quantity FROM products WHERE id = ?
    `).bind(qrInfo.product_id).first()

        return c.json({
            success: true,
            message: '입고가 완료되었습니다',
            transaction: {
                product_name: qrInfo.product_name,
                quantity,
                previous_stock: qrInfo.current_stock,
                new_stock: updatedProduct?.quantity || 0,
                warehouse_id
            }
        })
    } catch (error: any) {
        console.error('QR 입고 처리 오류:', error)
        return c.json({ error: 'QR 입고 처리 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 8. QR 출고 처리
// ================================================
qr.post('/outbound', async (c) => {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')

    const { qr_code, quantity, warehouse_id, notes } = await c.req.json()

    if (!qr_code || !quantity || !warehouse_id) {
        return c.json({ error: '필수 항목을 모두 입력하세요' }, 400)
    }

    if (quantity < 1) {
        return c.json({ error: '올바른 수량을 입력하세요' }, 400)
    }

    try {
        // QR 코드 정보 조회
        const qrInfo = await c.env.DB.prepare(`
      SELECT 
        qc.id AS qr_id,
        qc.product_id,
        qc.status,
        p.name AS product_name,
        p.quantity AS current_stock
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE qc.code = ? AND p.tenant_id = ?
    `).bind(qr_code, tenantId).first()

        if (!qrInfo) {
            return c.json({ error: 'QR 코드를 찾을 수 없습니다' }, 404)
        }

        if (qrInfo.status !== 'active') {
            return c.json({ error: `비활성화된 QR 코드입니다 (상태: ${qrInfo.status})` }, 400)
        }

        // 재고 부족 확인
        if (qrInfo.current_stock < quantity) {
            return c.json({
                error: '재고가 부족합니다',
                current_stock: qrInfo.current_stock,
                requested: quantity
            }, 400)
        }

        // 트랜잭션으로 묶어서 처리
        const batch = []

        // 1. QR 트랜잭션 기록
        batch.push(
            c.env.DB.prepare(`
        INSERT INTO qr_transactions (qr_code_id, transaction_type, quantity, warehouse_id, created_by, notes)
        VALUES (?, 'outbound', ?, ?, ?, ?)
      `).bind(qrInfo.qr_id, quantity, warehouse_id, userId, notes || null)
        )

        // 2. 제품 재고 감소
        batch.push(
            c.env.DB.prepare(`
        UPDATE products 
        SET quantity = quantity - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(quantity, qrInfo.product_id)
        )

        // 3. 재고 이력 기록
        batch.push(
            c.env.DB.prepare(`
        INSERT INTO stock_movements (product_id, quantity, movement_type, warehouse_id, notes, created_by)
        VALUES (?, ?, 'out', ?, ?, ?)
      `).bind(qrInfo.product_id, quantity, warehouse_id, `QR 출고: ${qr_code}${notes ? ' - ' + notes : ''}`, userId)
        )

        await c.env.DB.batch(batch)

        // 업데이트된 재고 조회
        const updatedProduct = await c.env.DB.prepare(`
      SELECT quantity FROM products WHERE id = ?
    `).bind(qrInfo.product_id).first()

        return c.json({
            success: true,
            message: '출고가 완료되었습니다',
            transaction: {
                product_name: qrInfo.product_name,
                quantity,
                previous_stock: qrInfo.current_stock,
                new_stock: updatedProduct?.quantity || 0,
                warehouse_id
            }
        })
    } catch (error: any) {
        console.error('QR 출고 처리 오류:', error)
        return c.json({ error: 'QR 출고 처리 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 9. QR 트랜잭션 이력 조회
// ================================================
qr.get('/transactions/:type', async (c) => {
    const tenantId = c.get('tenantId')
    const type = c.req.param('type') // 'inbound', 'outbound', 'sale', 'all'
    const limit = parseInt(c.req.query('limit') || '20')
    const date = c.req.query('date') // YYYY-MM-DD 형식

    try {
        let query = `
      SELECT 
        qt.id,
        qt.transaction_type,
        qt.quantity,
        qt.notes,
        qt.created_at,
        qc.code AS qr_code,
        p.name AS product_name,
        p.code AS product_code,
        w.name AS warehouse_name,
        u.name AS user_name
      FROM qr_transactions qt
      LEFT JOIN qr_codes qc ON qt.qr_code_id = qc.id
      LEFT JOIN products p ON qc.product_id = p.id
      LEFT JOIN warehouses w ON qt.warehouse_id = w.id
      LEFT JOIN users u ON qt.created_by = u.id
      WHERE p.tenant_id = ?
    `
        const params: any[] = [tenantId]

        if (type !== 'all') {
            query += ' AND qt.transaction_type = ?'
            params.push(type)
        }

        if (date) {
            query += ' AND DATE(qt.created_at) = ?'
            params.push(date)
        }

        query += ' ORDER BY qt.created_at DESC LIMIT ?'
        params.push(limit)

        const { results } = await c.env.DB.prepare(query).bind(...params).all()

        return c.json({
            success: true,
            transactions: results
        })
    } catch (error: any) {
        console.error('QR 트랜잭션 조회 오류:', error)
        return c.json({ error: '트랜잭션 조회 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

// ================================================
// 10. QR 판매 처리
// ================================================
qr.post('/sale', async (c) => {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')

    const { qr_code, quantity, customer_name, sale_price, notes } = await c.req.json()

    if (!qr_code) {
        return c.json({ error: 'QR 코드가 필요합니다' }, 400)
    }

    if (!quantity || quantity < 1) {
        return c.json({ error: '올바른 수량을 입력하세요' }, 400)
    }

    if (!sale_price || sale_price < 0) {
        return c.json({ error: '올바른 판매가를 입력하세요' }, 400)
    }

    try {
        // QR 코드 정보 조회
        const qrInfo = await c.env.DB.prepare(`
      SELECT 
        qc.id AS qr_id,
        qc.product_id,
        qc.status,
        p.name AS product_name,
        p.quantity AS current_stock,
        p.price AS product_price
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE qc.code = ? AND p.tenant_id = ?
    `).bind(qr_code, tenantId).first()

        if (!qrInfo) {
            return c.json({ error: 'QR 코드를 찾을 수 없습니다' }, 404)
        }

        if (qrInfo.status !== 'active') {
            return c.json({ error: `비활성화된 QR 코드입니다 (상태: ${qrInfo.status})` }, 400)
        }

        // 재고 부족 확인
        if (qrInfo.current_stock < quantity) {
            return c.json({
                error: '재고가 부족합니다',
                current_stock: qrInfo.current_stock,
                requested: quantity
            }, 400)
        }

        // 트랜잭션으로 묶어서 처리
        const batch = []
        const totalAmount = sale_price * quantity

        // 1. QR 트랜잭션 기록
        batch.push(
            c.env.DB.prepare(`
        INSERT INTO qr_transactions (qr_code_id, transaction_type, quantity, created_by, notes)
        VALUES (?, 'sale', ?, ?, ?)
      `).bind(qrInfo.qr_id, quantity, userId, notes || null)
        )

        // 2. 제품 재고 감소
        batch.push(
            c.env.DB.prepare(`
        UPDATE products 
        SET quantity = quantity - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(quantity, qrInfo.product_id)
        )

        // 3. 판매 기록 추가 (sales 테이블에)
        batch.push(
            c.env.DB.prepare(`
        INSERT INTO sales (product_id, quantity, unit_price, total_amount, customer_name, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(qrInfo.product_id, quantity, sale_price, totalAmount, customer_name || null, `QR 판매: ${qr_code}${notes ? ' - ' + notes : ''}`, userId)
        )

        // 4. 재고 이력 기록
        batch.push(
            c.env.DB.prepare(`
        INSERT INTO stock_movements (product_id, quantity, movement_type, notes, created_by)
        VALUES (?, ?, 'out', ?, ?)
      `).bind(qrInfo.product_id, quantity, `QR 판매: ${qr_code}${customer_name ? ' - ' + customer_name : ''}`, userId)
        )

        await c.env.DB.batch(batch)

        // 업데이트된 재고 조회
        const updatedProduct = await c.env.DB.prepare(`
      SELECT quantity FROM products WHERE id = ?
    `).bind(qrInfo.product_id).first()

        return c.json({
            success: true,
            message: '판매가 완료되었습니다',
            transaction: {
                product_name: qrInfo.product_name,
                quantity,
                sale_price,
                total_amount: totalAmount,
                previous_stock: qrInfo.current_stock,
                new_stock: updatedProduct?.quantity || 0,
                customer_name
            }
        })
    } catch (error: any) {
        console.error('QR 판매 처리 오류:', error)
        return c.json({ error: 'QR 판매 처리 중 오류가 발생했습니다', details: error.message }, 500)
    }
})

export default qr
