import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 공급사 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const search = c.req.query('search') || ''

    let query = 'SELECT * FROM suppliers WHERE tenant_id = ?'
    const params: any[] = [tenantId]

    if (search) {
        query += ' AND (name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC'

    const { results } = await DB.prepare(query).bind(...params).all()

    return c.json({ success: true, data: results })
})

// 공급사 상세 조회
app.get('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    const supplier = await DB.prepare('SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .first()

    if (!supplier) {
        return c.json({ success: false, error: 'Supplier not found' }, 404)
    }

    return c.json({ success: true, data: supplier })
})

// 공급사 등록
app.post('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const body = await c.req.json()

    // 필수 필드 체크
    if (!body.name) {
        return c.json({ success: false, error: '공급사명은 필수입니다.' }, 400)
    }

    const res = await DB.prepare(`
    INSERT INTO suppliers (tenant_id, name, contact_person, phone, email, address, business_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
        tenantId,
        body.name,
        body.contact_person || null,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.business_number || null,
        body.notes || null
    ).run()

    return c.json({ success: true, data: { id: res.meta.last_row_id }, message: '공급사가 등록되었습니다.' })
})

// 공급사 수정
app.put('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json()

    const supplier = await DB.prepare('SELECT id FROM suppliers WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .first()

    if (!supplier) {
        return c.json({ success: false, error: 'Supplier not found' }, 404)
    }

    await DB.prepare(`
    UPDATE suppliers 
    SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, business_number = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(
        body.name,
        body.contact_person || null,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.business_number || null,
        body.notes || null,
        id,
        tenantId
    ).run()

    return c.json({ success: true, message: '공급사 정보가 수정되었습니다.' })
})

// 공급사 삭제
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    // 사용 중인 발주서가 있는지 확인
    const usage = await DB.prepare('SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?').bind(id).first('count')

    if (usage && usage > 0) {
        return c.json({ success: false, error: '발주 내역이 존재하는 공급사는 삭제할 수 없습니다.' }, 400)
    }

    await DB.prepare('DELETE FROM suppliers WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .run()

    return c.json({ success: true, message: '공급사가 삭제되었습니다.' })
})

export default app
