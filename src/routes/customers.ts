import { Hono } from 'hono'
import type { Bindings, Variables, Customer, CreateCustomerRequest } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 고객 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const search = c.req.query('search') || ''
  const purchase_path = c.req.query('purchase_path') || ''
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = (page - 1) * limit

  // 조건절 구성
  let whereClause = 'WHERE tenant_id = ?'
  const params: any[] = [tenantId]

  if (search) {
    whereClause += ' AND (name LIKE ? OR phone LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  if (purchase_path) {
    whereClause += ' AND purchase_path = ?'
    params.push(purchase_path)
  }

  // 전체 개수 조회
  const countResult = await DB.prepare(`SELECT COUNT(*) as total FROM customers ${whereClause}`)
    .bind(...params)
    .first<{ total: number }>()
  const total = countResult?.total || 0

  // 데이터 조회 (sales 테이블 기반으로 총 구매액과 구매 횟수 계산)
  const query = `
    SELECT c.*,
      (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed' AND s.tenant_id = c.tenant_id) as purchase_count,
      (SELECT COALESCE(SUM(s.final_amount), 0) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed' AND s.tenant_id = c.tenant_id) as total_purchase_amount
    FROM customers c
    ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `
  const { results } = await DB.prepare(query)
    .bind(...params, limit, offset)
    .all<Customer>()

  return c.json({
    success: true,
    data: results,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    }
  })
})

// 고객 상세 조회
app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const customer = await DB.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed' AND s.tenant_id = c.tenant_id) as purchase_count,
      (SELECT COALESCE(SUM(s.final_amount), 0) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed' AND s.tenant_id = c.tenant_id) as total_purchase_amount
    FROM customers c
    WHERE c.id = ? AND c.tenant_id = ?
  `)
    .bind(id, tenantId)
    .first<Customer>()

  if (!customer) {
    return c.json({ success: false, error: '고객을 찾을 수 없습니다.' }, 404)
  }

  return c.json({ success: true, data: customer })
})

// 고객 등록
app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<CreateCustomerRequest>()

  // 연락처 중복 체크 (같은 테넌트 내에서만)
  const existing = await DB.prepare('SELECT id FROM customers WHERE phone = ? AND tenant_id = ?')
    .bind(body.phone, tenantId)
    .first()

  if (existing) {
    return c.json({ success: false, error: '이미 등록된 연락처입니다.' }, 400)
  }

  const result = await DB.prepare(`
    INSERT INTO customers (name, phone, email, zip_code, address, address_detail, company, department, position, birthday, purchase_path, notes, tenant_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.name,
    body.phone,
    body.email || null,
    body.zip_code || null,
    body.address || null,
    body.address_detail || null,
    body.company || null,
    body.department || null,
    body.position || null,
    body.birthday || null,
    body.purchase_path || '기타',
    body.notes || null,
    tenantId
  ).run()

  return c.json({
    success: true,
    data: { id: result.meta.last_row_id },
    message: '고객이 등록되었습니다.'
  })
})

// 고객 수정
app.put('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<Partial<CreateCustomerRequest>>()

  const customer = await DB.prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first()

  if (!customer) {
    return c.json({ success: false, error: '고객을 찾을 수 없습니다.' }, 404)
  }

  const updates: string[] = []
  const params: any[] = []

  if (body.name !== undefined) {
    updates.push('name = ?')
    params.push(body.name)
  }
  if (body.phone !== undefined) {
    // 다른 고객이 같은 번호를 사용하는지 체크 (같은 테넌트 내에서만)
    const existing = await DB.prepare('SELECT id FROM customers WHERE phone = ? AND id != ? AND tenant_id = ?')
      .bind(body.phone, id, tenantId)
      .first()

    if (existing) {
      return c.json({ success: false, error: '이미 등록된 연락처입니다.' }, 400)
    }

    updates.push('phone = ?')
    params.push(body.phone)
  }
  if (body.email !== undefined) {
    updates.push('email = ?')
    params.push(body.email)
  }
  if (body.zip_code !== undefined) {
    updates.push('zip_code = ?')
    params.push(body.zip_code)
  }
  if (body.address !== undefined) {
    updates.push('address = ?')
    params.push(body.address)
  }
  if (body.address_detail !== undefined) {
    updates.push('address_detail = ?')
    params.push(body.address_detail)
  }
  if (body.company !== undefined) {
    updates.push('company = ?')
    params.push(body.company)
  }
  if (body.department !== undefined) {
    updates.push('department = ?')
    params.push(body.department)
  }
  if (body.position !== undefined) {
    updates.push('position = ?')
    params.push(body.position)
  }
  if (body.birthday !== undefined) {
    updates.push('birthday = ?')
    params.push(body.birthday)
  }
  if (body.purchase_path !== undefined) {
    updates.push('purchase_path = ?')
    params.push(body.purchase_path)
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?')
    params.push(body.notes)
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '수정할 내용이 없습니다.' }, 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await DB.prepare(`
    UPDATE customers SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run()

  return c.json({ success: true, message: '고객 정보가 수정되었습니다.' })
})

// 고객 삭제
app.delete('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const customer = await DB.prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first()

  if (!customer) {
    return c.json({ success: false, error: '고객을 찾을 수 없습니다.' }, 404)
  }

  // 판매 이력이 있는지 체크
  const salesCount = await DB.prepare('SELECT COUNT(*) as count FROM sales WHERE customer_id = ?')
    .bind(id)
    .first<{ count: number }>()

  if (salesCount && salesCount.count > 0) {
    return c.json({
      success: false,
      error: '판매 이력이 있는 고객은 삭제할 수 없습니다.'
    }, 400)
  }

  await DB.prepare('DELETE FROM customers WHERE id = ?')
    .bind(id)
    .run()

  return c.json({ success: true, message: '고객이 삭제되었습니다.' })
})

// 고객 구매 이력 조회
app.get('/:id/purchases', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const customer = await DB.prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first()

  if (!customer) {
    return c.json({ success: false, error: '고객을 찾을 수 없습니다.' }, 404)
  }

  const { results } = await DB.prepare(`
    SELECT s.*, 
           GROUP_CONCAT(p.name || ' x' || si.quantity) as items
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.customer_id = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).bind(id).all()

  return c.json({ success: true, data: results })
})

export default app
