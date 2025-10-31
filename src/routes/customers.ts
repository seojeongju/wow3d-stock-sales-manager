import { Hono } from 'hono'
import type { Bindings, Customer, CreateCustomerRequest } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 고객 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const search = c.req.query('search') || ''
  const grade = c.req.query('grade') || ''

  let query = 'SELECT * FROM customers WHERE 1=1'
  const params: any[] = []

  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  if (grade) {
    query += ' AND grade = ?'
    params.push(grade)
  }

  query += ' ORDER BY total_purchase_amount DESC'

  const { results } = await DB.prepare(query).bind(...params).all<Customer>()
  
  return c.json({ success: true, data: results })
})

// 고객 상세 조회
app.get('/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  const customer = await DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
    .first<Customer>()

  if (!customer) {
    return c.json({ success: false, error: '고객을 찾을 수 없습니다.' }, 404)
  }

  return c.json({ success: true, data: customer })
})

// 고객 등록
app.post('/', async (c) => {
  const { DB } = c.env
  const body = await c.req.json<CreateCustomerRequest>()

  // 연락처 중복 체크
  const existing = await DB.prepare('SELECT id FROM customers WHERE phone = ?')
    .bind(body.phone)
    .first()

  if (existing) {
    return c.json({ success: false, error: '이미 등록된 연락처입니다.' }, 400)
  }

  const result = await DB.prepare(`
    INSERT INTO customers (name, phone, email, address, birthday, grade, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.name,
    body.phone,
    body.email || null,
    body.address || null,
    body.birthday || null,
    body.grade || '일반',
    body.notes || null
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
  const id = c.req.param('id')
  const body = await c.req.json<Partial<CreateCustomerRequest>>()

  const customer = await DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
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
    // 다른 고객이 같은 번호를 사용하는지 체크
    const existing = await DB.prepare('SELECT id FROM customers WHERE phone = ? AND id != ?')
      .bind(body.phone, id)
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
  if (body.address !== undefined) {
    updates.push('address = ?')
    params.push(body.address)
  }
  if (body.birthday !== undefined) {
    updates.push('birthday = ?')
    params.push(body.birthday)
  }
  if (body.grade !== undefined) {
    updates.push('grade = ?')
    params.push(body.grade)
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
  const id = c.req.param('id')

  const customer = await DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
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
  const id = c.req.param('id')

  const customer = await DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
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
