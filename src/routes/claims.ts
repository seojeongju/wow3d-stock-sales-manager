import { Hono } from 'hono'
import type { Bindings, Claim, CreateClaimRequest, UpdateClaimStatusRequest } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 클레임 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const type = c.req.query('type') || ''
    const status = c.req.query('status') || ''

    let query = `
    SELECT c.*, s.customer_id, cust.name as customer_name, cust.phone as customer_phone,
           p.name as product_name, ci.quantity, ci.condition
    FROM claims c
    JOIN sales s ON c.sale_id = s.id
    LEFT JOIN customers cust ON s.customer_id = cust.id
    JOIN claim_items ci ON c.id = ci.claim_id
    JOIN products p ON ci.product_id = p.id
    WHERE 1=1
  `
    const params: any[] = []

    if (type) {
        query += ' AND c.type = ?'
        params.push(type)
    }

    if (status) {
        query += ' AND c.status = ?'
        params.push(status)
    }

    query += ' ORDER BY c.created_at DESC'

    const { results } = await DB.prepare(query).bind(...params).all()

    return c.json({ success: true, data: results })
})

// 클레임 생성 (반품/교환 요청)
app.post('/', async (c) => {
    const { DB } = c.env
    const body = await c.req.json<CreateClaimRequest>()

    // 판매 내역 확인
    const sale = await DB.prepare('SELECT * FROM sales WHERE id = ?').bind(body.sale_id).first()
    if (!sale) {
        return c.json({ success: false, error: '판매 내역을 찾을 수 없습니다.' }, 404)
    }

    // 클레임 생성
    const claimResult = await DB.prepare(`
    INSERT INTO claims (sale_id, type, reason, status)
    VALUES (?, ?, ?, 'requested')
  `).bind(body.sale_id, body.type, body.reason || null).run()

    const claimId = claimResult.meta.last_row_id

    // 클레임 아이템 생성
    for (const item of body.items) {
        await DB.prepare(`
      INSERT INTO claim_items (claim_id, product_id, quantity, condition)
      VALUES (?, ?, ?, ?)
    `).bind(claimId, item.product_id, item.quantity, item.condition || 'good').run()
    }

    return c.json({ success: true, message: '반품/교환 요청이 등록되었습니다.' })
})

// 클레임 상태 변경
app.put('/:id/status', async (c) => {
    const { DB } = c.env
    const id = c.req.param('id')
    const body = await c.req.json<UpdateClaimStatusRequest>()

    const claim = await DB.prepare('SELECT * FROM claims WHERE id = ?').bind(id).first<Claim>()
    if (!claim) {
        return c.json({ success: false, error: '클레임 내역을 찾을 수 없습니다.' }, 404)
    }

    if (claim.status === 'completed' || claim.status === 'rejected') {
        return c.json({ success: false, error: '이미 처리된 클레임입니다.' }, 400)
    }

    // 상태 업데이트
    await DB.prepare(`
    UPDATE claims 
    SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(body.status, body.admin_notes || null, id).run()

    // 승인(approved) 시 재고 처리
    // 반품인 경우 재고 입고 처리
    if (body.status === 'approved' && claim.type === 'return') {
        const { results: items } = await DB.prepare('SELECT * FROM claim_items WHERE claim_id = ?').bind(id).all<any>()

        for (const item of items) {
            // 재고 증가
            await DB.prepare(`
        UPDATE products 
        SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(item.quantity, item.product_id).run()

            // 재고 이동 기록
            await DB.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, quantity, reason, reference_id)
        VALUES (?, '입고', ?, '반품 입고', ?)
      `).bind(item.product_id, item.quantity, claim.sale_id).run()
        }
    }

    return c.json({ success: true, message: '상태가 변경되었습니다.' })
})

export default app
