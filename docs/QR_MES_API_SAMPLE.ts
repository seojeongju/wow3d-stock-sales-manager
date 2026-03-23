// QR MES API 엔드포인트 샘플 코드
// Hono 프레임워크 기반 Cloudflare Workers API

import { Hono } from 'hono';

const qrAPI = new Hono();

// ================================================
// 1. QR 코드로 제품 조회
// ================================================
/**
 * GET /api/qr/product?code=QR00000001
 * QR 코드를 스캔하여 제품 정보를 조회
 */
qrAPI.get('/product', async (c) => {
    const qrCode = c.req.query('code');

    if (!qrCode) {
        return c.json({ error: 'QR 코드가 필요합니다' }, 400);
    }

    try {
        // QR 코드로 제품 정보 조회
        const qrInfo = await c.env.DB.prepare(`
      SELECT 
        qc.id AS qr_id,
        qc.code AS qr_code,
        qc.type,
        qc.status,
        qc.batch_number,
        qc.manufacture_date,
        qc.expiry_date,
        p.id AS product_id,
        p.name AS product_name,
        p.code AS product_code,
        p.price,
        p.category,
        p.quantity AS current_stock
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE qc.code = ?
    `).bind(qrCode).first();

        if (!qrInfo) {
            // 스캔 로그 기록 (실패)
            await c.env.DB.prepare(`
        INSERT INTO qr_scan_logs (qr_code, scan_result, user_id, ip_address)
        VALUES (?, 'not_found', ?, ?)
      `).bind(qrCode, c.get('userId'), c.req.header('CF-Connecting-IP')).run();

            return c.json({ error: '존재하지 않는 QR 코드입니다' }, 404);
        }

        // 비활성화된 QR 코드 체크
        if (qrInfo.status !== 'active') {
            await c.env.DB.prepare(`
        INSERT INTO qr_scan_logs (qr_code, scan_result, product_id, user_id, ip_address)
        VALUES (?, 'inactive', ?, ?, ?)
      `).bind(qrCode, qrInfo.product_id, c.get('userId'), c.req.header('CF-Connecting-IP')).run();

            return c.json({ error: '비활성화된 QR 코드입니다', status: qrInfo.status }, 400);
        }

        // 스캔 로그 기록 (성공)
        await c.env.DB.prepare(`
      INSERT INTO qr_scan_logs (qr_code, scan_result, product_id, user_id, ip_address)
      VALUES (?, 'success', ?, ?, ?)
    `).bind(qrCode, qrInfo.product_id, c.get('userId'), c.req.header('CF-Connecting-IP')).run();

        return c.json(qrInfo);
    } catch (error) {
        console.error('QR product lookup error:', error);
        return c.json({ error: '제품 조회 중 오류가 발생했습니다' }, 500);
    }
});

// ================================================
// 2. QR 스캔 입고 등록
// ================================================
/**
 * POST /api/qr/inbound
 * QR 코드를 스캔하여 입고 등록
 * 
 * Body:
 * {
 *   "product_id": 1,
 *   "qr_code": "QR00000001",
 *   "quantity": 10,
 *   "warehouse_id": 1,
 *   "notes": "메모"
 * }
 */
qrAPI.post('/inbound', async (c) => {
    const userId = c.get('userId');
    const { product_id, qr_code, quantity, warehouse_id, notes } = await c.req.json();

    // 입력 검증
    if (!product_id || !qr_code || !quantity || !warehouse_id) {
        return c.json({ error: '필수 항목이 누락되었습니다' }, 400);
    }

    if (quantity <= 0) {
        return c.json({ error: '수량은 0보다 커야 합니다' }, 400);
    }

    try {
        // QR 코드 유효성 검증
        const qrInfo = await c.env.DB.prepare(`
      SELECT id, product_id, status 
      FROM qr_codes 
      WHERE code = ?
    `).bind(qr_code).first();

        if (!qrInfo) {
            return c.json({ error: '존재하지 않는 QR 코드입니다' }, 404);
        }

        if (qrInfo.status !== 'active') {
            return c.json({ error: '비활성화된 QR 코드입니다' }, 400);
        }

        if (qrInfo.product_id !== product_id) {
            return c.json({ error: 'QR 코드와 제품이 일치하지 않습니다' }, 400);
        }

        // 트랜잭션 시작 (복수 작업 원자성 보장)
        const batch = [
            // 1. 기존 inbounds 테이블에 입고 기록
            c.env.DB.prepare(`
        INSERT INTO inbounds (warehouse_id, notes, status, created_by)
        VALUES (?, ?, 'completed', ?)
      `).bind(warehouse_id, notes || '', userId),

            // 2. inbound_items 테이블에 상세 기록
            c.env.DB.prepare(`
        INSERT INTO inbound_items (inbound_id, product_id, quantity, price)
        SELECT 
          (SELECT id FROM inbounds ORDER BY id DESC LIMIT 1),
          ?,
          ?,
          p.purchase_price
        FROM products p
        WHERE p.id = ?
      `).bind(product_id, quantity, product_id),

            // 3. QR 트랜잭션 이력 기록
            c.env.DB.prepare(`
        INSERT INTO qr_transactions (
          qr_code_id, transaction_type, reference_type, 
          product_id, quantity, warehouse_id, notes, 
          device_info, created_by
        )
        VALUES (?, 'inbound', 'inbound', ?, ?, ?, ?, ?, ?)
      `).bind(
                qrInfo.id,
                product_id,
                quantity,
                warehouse_id,
                notes || '',
                c.req.header('User-Agent'),
                userId
            ),

            // 4. 제품 재고 업데이트
            c.env.DB.prepare(`
        UPDATE products 
        SET quantity = quantity + ? 
        WHERE id = ?
      `).bind(quantity, product_id)
        ];

        // 배치 실행
        await c.env.DB.batch(batch);

        return c.json({
            success: true,
            message: '입고가 완료되었습니다',
            quantity: quantity
        });
    } catch (error) {
        console.error('QR inbound error:', error);
        return c.json({ error: '입고 등록 중 오류가 발생했습니다' }, 500);
    }
});

// ================================================
// 3. QR 스캔 출고 등록
// ================================================
/**
 * POST /api/qr/outbound
 * QR 코드를 스캔하여 출고 등록
 */
qrAPI.post('/outbound', async (c) => {
    const userId = c.get('userId');
    const { product_id, qr_code, quantity, warehouse_id, notes } = await c.req.json();

    // 입력 검증
    if (!product_id || !qr_code || !quantity || !warehouse_id) {
        return c.json({ error: '필수 항목이 누락되었습니다' }, 400);
    }

    if (quantity <= 0) {
        return c.json({ error: '수량은 0보다 커야 합니다' }, 400);
    }

    try {
        // QR 코드 유효성 검증
        const qrInfo = await c.env.DB.prepare(`
      SELECT id, product_id, status 
      FROM qr_codes 
      WHERE code = ?
    `).bind(qr_code).first();

        if (!qrInfo) {
            return c.json({ error: '존재하지 않는 QR 코드입니다' }, 404);
        }

        if (qrInfo.status !== 'active') {
            return c.json({ error: '비활성화된 QR 코드입니다' }, 400);
        }

        // 재고 확인
        const product = await c.env.DB.prepare(`
      SELECT id, name, quantity 
      FROM products 
      WHERE id = ?
    `).bind(product_id).first();

        if (!product) {
            return c.json({ error: '존재하지 않는 제품입니다' }, 404);
        }

        if (product.quantity < quantity) {
            return c.json({
                error: '재고가 부족합니다',
                current_stock: product.quantity,
                requested: quantity
            }, 400);
        }

        // 트랜잭션 배치
        const batch = [
            // 1. outbounds 테이블에 출고 기록
            c.env.DB.prepare(`
        INSERT INTO outbounds (warehouse_id, notes, status, created_by)
        VALUES (?, ?, 'completed', ?)
      `).bind(warehouse_id, notes || '', userId),

            // 2. outbound_items 테이블에 상세 기록
            c.env.DB.prepare(`
        INSERT INTO outbound_items (outbound_id, product_id, quantity)
        SELECT 
          (SELECT id FROM outbounds ORDER BY id DESC LIMIT 1),
          ?,
          ?
      `).bind(product_id, quantity),

            // 3. QR 트랜잭션 이력 기록
            c.env.DB.prepare(`
        INSERT INTO qr_transactions (
          qr_code_id, transaction_type, reference_type,
          product_id, quantity, warehouse_id, notes,
          device_info, created_by
        )
        VALUES (?, 'outbound', 'outbound', ?, ?, ?, ?, ?, ?)
      `).bind(
                qrInfo.id,
                product_id,
                quantity,
                warehouse_id,
                notes || '',
                c.req.header('User-Agent'),
                userId
            ),

            // 4. 제품 재고 차감
            c.env.DB.prepare(`
        UPDATE products 
        SET quantity = quantity - ? 
        WHERE id = ?
      `).bind(quantity, product_id)
        ];

        await c.env.DB.batch(batch);

        return c.json({
            success: true,
            message: '출고가 완료되었습니다',
            quantity: quantity,
            remaining_stock: product.quantity - quantity
        });
    } catch (error) {
        console.error('QR outbound error:', error);
        return c.json({ error: '출고 등록 중 오류가 발생했습니다' }, 500);
    }
});

// ================================================
// 4. QR 스캔 판매 등록
// ================================================
/**
 * POST /api/qr/sale
 * QR 코드를 스캔하여 판매 등록
 */
qrAPI.post('/sale', async (c) => {
    const userId = c.get('userId');
    const { product_id, qr_code, quantity, price, payment_method, notes } = await c.req.json();

    if (!product_id || !qr_code || !quantity || !price) {
        return c.json({ error: '필수 항목이 누락되었습니다' }, 400);
    }

    try {
        // QR 및 재고 검증
        const qrInfo = await c.env.DB.prepare(`
      SELECT qc.id, qc.product_id, qc.status, p.quantity
      FROM qr_codes qc
      JOIN products p ON qc.product_id = p.id
      WHERE qc.code = ?
    `).bind(qr_code).first();

        if (!qrInfo) {
            return c.json({ error: '존재하지 않는 QR 코드입니다' }, 404);
        }

        if (qrInfo.quantity < quantity) {
            return c.json({ error: '재고가 부족합니다' }, 400);
        }

        // 트랜잭션 배치
        const totalAmount = price * quantity;
        const batch = [
            // 1. sales 테이블에 판매 기록
            c.env.DB.prepare(`
        INSERT INTO sales (total_amount, payment_method, notes, status, created_by)
        VALUES (?, ?, ?, 'completed', ?)
      `).bind(totalAmount, payment_method || 'cash', notes || '', userId),

            // 2. sale_items 테이블에 상세 기록
            c.env.DB.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, price)
        SELECT 
          (SELECT id FROM sales ORDER BY id DESC LIMIT 1),
          ?, ?, ?
      `).bind(product_id, quantity, price),

            // 3. QR 트랜잭션 이력
            c.env.DB.prepare(`
        INSERT INTO qr_transactions (
          qr_code_id, transaction_type, reference_type,
          product_id, quantity, notes, device_info, created_by
        )
        VALUES (?, 'sale', 'sale', ?, ?, ?, ?, ?)
      `).bind(qrInfo.id, product_id, quantity, notes || '', c.req.header('User-Agent'), userId),

            // 4. 재고 차감
            c.env.DB.prepare(`
        UPDATE products 
        SET quantity = quantity - ? 
        WHERE id = ?
      `).bind(quantity, product_id)
        ];

        await c.env.DB.batch(batch);

        return c.json({
            success: true,
            message: '판매가 완료되었습니다',
            total_amount: totalAmount
        });
    } catch (error) {
        console.error('QR sale error:', error);
        return c.json({ error: '판매 등록 중 오류가 발생했습니다' }, 500);
    }
});

// ================================================
// 5. QR 트랜잭션 이력 조회
// ================================================
/**
 * GET /api/qr/inbound/history?date=2026-01-13
 * 특정 날짜의 입고 이력 조회
 */
qrAPI.get('/inbound/history', async (c) => {
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];

    try {
        const history = await c.env.DB.prepare(`
      SELECT 
        qt.id,
        qt.created_at,
        qc.code AS qr_code,
        p.name AS product_name,
        qt.quantity,
        w.name AS warehouse_name,
        u.name AS user_name,
        qt.notes
      FROM qr_transactions qt
      LEFT JOIN qr_codes qc ON qt.qr_code_id = qc.id
      LEFT JOIN products p ON qt.product_id = p.id
      LEFT JOIN warehouses w ON qt.warehouse_id = w.id
      LEFT JOIN users u ON qt.created_by = u.id
      WHERE qt.transaction_type = 'inbound'
        AND DATE(qt.created_at) = ?
      ORDER BY qt.created_at DESC
    `).bind(date).all();

        return c.json(history.results || []);
    } catch (error) {
        console.error('QR inbound history error:', error);
        return c.json({ error: '이력 조회 중 오류가 발생했습니다' }, 500);
    }
});

// ================================================
// 6. QR 코드 생성
// ================================================
/**
 * POST /api/qr/generate
 * 제품에 대한 QR 코드 생성
 * 
 * Body:
 * {
 *   "product_id": 1,
 *   "quantity": 10,  // 생성할 QR 코드 개수
 *   "type": "product",
 *   "batch_number": "BATCH-20260113-001"
 * }
 */
qrAPI.post('/generate', async (c) => {
    const userId = c.get('userId');
    const { product_id, quantity, type, batch_number } = await c.req.json();

    if (!product_id || !quantity) {
        return c.json({ error: '필수 항목이 누락되었습니다' }, 400);
    }

    try {
        const generatedCodes = [];

        for (let i = 0; i < quantity; i++) {
            // UUID 생성 (단순 예시, 실제로는 crypto.randomUUID() 사용)
            const uuid = `QR${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

            const result = await c.env.DB.prepare(`
        INSERT INTO qr_codes (code, product_id, type, batch_number, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).bind(uuid, product_id, type || 'product', batch_number || null, userId).run();

            generatedCodes.push({
                id: result.meta.last_row_id,
                code: uuid
            });
        }

        return c.json({
            success: true,
            message: `${quantity}개의 QR 코드가 생성되었습니다`,
            codes: generatedCodes
        });
    } catch (error) {
        console.error('QR generation error:', error);
        return c.json({ error: 'QR 코드 생성 중 오류가 발생했습니다' }, 500);
    }
});

// ================================================
// 7. QR MES 대시보드 통계
// ================================================
/**
 * GET /api/qr/dashboard/stats
 * QR MES 대시보드 실시간 통계
 */
qrAPI.get('/dashboard/stats', async (c) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 오늘의 통계 조회
        const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(CASE WHEN transaction_type = 'inbound' THEN 1 END) AS today_inbound_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'inbound' THEN quantity END), 0) AS today_inbound_qty,
        COUNT(CASE WHEN transaction_type = 'outbound' THEN 1 END) AS today_outbound_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'outbound' THEN quantity END), 0) AS today_outbound_qty,
        COUNT(CASE WHEN transaction_type = 'sale' THEN 1 END) AS today_sale_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN quantity END), 0) AS today_sale_qty
      FROM qr_transactions
      WHERE DATE(created_at) = ?
    `).bind(today).first();

        // 전체 QR 코드 통계
        const qrStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) AS total_qr_codes,
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_qr_codes,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive_qr_codes
      FROM qr_codes
    `).first();

        return c.json({
            today: stats,
            qr_codes: qrStats
        });
    } catch (error) {
        console.error('QR dashboard stats error:', error);
        return c.json({ error: '통계 조회 중 오류가 발생했습니다' }, 500);
    }
});

export default qrAPI;
