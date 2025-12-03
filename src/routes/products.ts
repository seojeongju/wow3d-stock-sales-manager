import { Hono } from 'hono'
import type { Bindings, Product, CreateProductRequest, UpdateProductRequest } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 상품 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const search = c.req.query('search') || ''
  const category = c.req.query('category') || ''
  const lowStock = c.req.query('lowStock') === 'true'

  let query = 'SELECT * FROM products WHERE is_active = 1'
  const params: any[] = []

  if (search) {
    query += ' AND (name LIKE ? OR sku LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  if (category) {
    query += ' AND category = ?'
    params.push(category)
  }

  if (lowStock) {
    query += ' AND current_stock <= min_stock_alert'
  }

  query += ' ORDER BY created_at DESC'

  const { results } = await DB.prepare(query).bind(...params).all<Product>()

  return c.json({ success: true, data: results })
})

// 상품 상세 조회
app.get('/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  const product = await DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first<Product>()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  return c.json({ success: true, data: product })
})

// 상품 등록
app.post('/', async (c) => {
  const { DB } = c.env
  const body = await c.req.json<CreateProductRequest>()

  // SKU 중복 체크
  const existing = await DB.prepare('SELECT id FROM products WHERE sku = ?')
    .bind(body.sku)
    .first()

  if (existing) {
    return c.json({ success: false, error: 'SKU가 이미 존재합니다.' }, 400)
  }

  const result = await DB.prepare(`
    INSERT INTO products (sku, name, category, category_medium, category_small, description, purchase_price, selling_price, 
                          current_stock, min_stock_alert, supplier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.sku,
    body.name,
    body.category,
    body.category_medium || null,
    body.category_small || null,
    body.description || null,
    body.purchase_price,
    body.selling_price,
    body.current_stock,
    body.min_stock_alert || 10,
    body.supplier || null
  ).run()

  // 재고 이동 기록 (초기 재고)
  if (body.current_stock > 0) {
    await DB.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reason)
      VALUES (?, '입고', ?, '초기 재고')
    `).bind(result.meta.last_row_id, body.current_stock).run()
  }

  return c.json({
    success: true,
    data: { id: result.meta.last_row_id },
    message: '상품이 등록되었습니다.'
  })
})

// 상품 수정
app.put('/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json<UpdateProductRequest>()

  const product = await DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  const updates: string[] = []
  const params: any[] = []

  if (body.name !== undefined) {
    updates.push('name = ?')
    params.push(body.name)
  }
  if (body.category !== undefined) {
    updates.push('category = ?')
    params.push(body.category)
  }
  if (body.category_medium !== undefined) {
    updates.push('category_medium = ?')
    params.push(body.category_medium)
  }
  if (body.category_small !== undefined) {
    updates.push('category_small = ?')
    params.push(body.category_small)
  }
  if (body.description !== undefined) {
    updates.push('description = ?')
    params.push(body.description)
  }
  if (body.purchase_price !== undefined) {
    updates.push('purchase_price = ?')
    params.push(body.purchase_price)
  }
  if (body.selling_price !== undefined) {
    updates.push('selling_price = ?')
    params.push(body.selling_price)
  }
  if (body.min_stock_alert !== undefined) {
    updates.push('min_stock_alert = ?')
    params.push(body.min_stock_alert)
  }
  if (body.supplier !== undefined) {
    updates.push('supplier = ?')
    params.push(body.supplier)
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '수정할 내용이 없습니다.' }, 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await DB.prepare(`
    UPDATE products SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run()

  return c.json({ success: true, message: '상품이 수정되었습니다.' })
})

// 상품 삭제 (비활성화)
app.delete('/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  const product = await DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  await DB.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(id)
    .run()

  return c.json({ success: true, message: '상품이 삭제되었습니다.' })
})

// 재고 부족 상품 조회
app.get('/alerts/low-stock', async (c) => {
  const { DB } = c.env

  const { results } = await DB.prepare(`
    SELECT * FROM products 
    WHERE is_active = 1 AND current_stock <= min_stock_alert
    ORDER BY current_stock ASC
  `).all<Product>()

  return c.json({ success: true, data: results })
})

// 카테고리 목록 조회
app.get('/meta/categories', async (c) => {
  const { DB } = c.env

  const { results } = await DB.prepare(`
    SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category
  `).all<{ category: string }>()

  return c.json({
    success: true,
    data: results.map(r => r.category)
  })
})

export default app
