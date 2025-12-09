import { Hono } from 'hono'
import type { Bindings, Variables, Product, CreateProductRequest, UpdateProductRequest } from '../types'
import { checkPlanLimit } from '../utils/subscription'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 상품 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const search = c.req.query('search') || ''
  const category = c.req.query('category') || ''
  const categoryMedium = c.req.query('category_medium') || ''
  const categorySmall = c.req.query('category_small') || ''
  const stockStatus = c.req.query('stock_status') || '' // out_of_stock, low_stock, in_stock
  const minPrice = parseInt(c.req.query('min_price') || '0')
  const maxPrice = parseInt(c.req.query('max_price') || '0')
  const startDate = c.req.query('start_date') || ''
  const endDate = c.req.query('end_date') || ''

  let query = 'SELECT * FROM products WHERE is_active = 1 AND tenant_id = ?'
  const params: any[] = [tenantId]

  if (search) {
    query += ' AND (name LIKE ? OR sku LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  if (category) {
    query += ' AND category = ?'
    params.push(category)
  }

  if (categoryMedium) {
    query += ' AND category_medium = ?'
    params.push(categoryMedium)
  }

  if (categorySmall) {
    query += ' AND category_small = ?'
    params.push(categorySmall)
  }

  if (stockStatus) {
    if (stockStatus === 'out_of_stock') {
      query += ' AND current_stock <= 0'
    } else if (stockStatus === 'low_stock') {
      query += ' AND current_stock <= min_stock_alert AND current_stock > 0'
    } else if (stockStatus === 'in_stock') {
      query += ' AND current_stock > min_stock_alert'
    }
  }

  if (minPrice > 0) {
    query += ' AND selling_price >= ?'
    params.push(minPrice)
  }

  if (maxPrice > 0) {
    query += ' AND selling_price <= ?'
    params.push(maxPrice)
  }

  if (startDate) {
    query += ' AND DATE(created_at) >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND DATE(created_at) <= ?'
    params.push(endDate)
  }

  query += ' ORDER BY created_at DESC'

  // Get total count for pagination (before LIMIT)
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total')
  const countResult = await DB.prepare(countQuery).bind(...params).first<{ total: number }>()
  const total = countResult?.total || 0

  // Pagination
  const limit = parseInt(c.req.query('limit') || '0')
  const offset = parseInt(c.req.query('offset') || '0')
  if (limit > 0) {
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }

  const { results } = await DB.prepare(query).bind(...params).all<Product>()

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

// 상품 상세 조회
app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Product>()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  return c.json({ success: true, data: product })
})

// 상품 등록
app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<CreateProductRequest>()

  // 플랜 한도 체크
  const limitCheck = await checkPlanLimit(DB, tenantId, 'products')
  if (!limitCheck.allowed) {
    return c.json({ success: false, error: limitCheck.error }, 403)
  }

  // SKU 중복 체크
  const existing = await DB.prepare('SELECT id FROM products WHERE sku = ? AND tenant_id = ?')
    .bind(body.sku, tenantId)
    .first()

  if (existing) {
    return c.json({ success: false, error: 'SKU가 이미 존재합니다.' }, 400)
  }

  const result = await DB.prepare(`
    INSERT INTO products (tenant_id, sku, name, category, category_medium, category_small, description, purchase_price, selling_price, 
                          current_stock, min_stock_alert, supplier, image_url, brand, tags, status, specifications)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    body.sku,
    body.name,
    body.category || '미분류',
    body.category_medium || null,
    body.category_small || null,
    body.description || null,
    body.purchase_price,
    body.selling_price,
    body.current_stock,
    body.min_stock_alert || 10,
    body.supplier || null,
    body.image_url || null,
    body.brand || null,
    body.tags || null,
    body.status || 'sale',
    body.specifications || null
  ).run()

  // 재고 이동 기록 (초기 재고) & 기본 창고 할당
  if (body.current_stock > 0) {
    // 1. 기본 창고 확인 또는 생성
    let defaultWarehouse = await DB.prepare('SELECT id FROM warehouses WHERE tenant_id = ? AND name = ?')
      .bind(tenantId, '기본 창고')
      .first<{ id: number }>()

    if (!defaultWarehouse) {
      const res = await DB.prepare('INSERT INTO warehouses (tenant_id, name, location, description) VALUES (?, ?, ?, ?) RETURNING id')
        .bind(tenantId, '기본 창고', '본사', '초기 재고 할당용 기본 창고')
        .first<{ id: number }>()
      defaultWarehouse = { id: res.id }
    }

    const warehouseId = defaultWarehouse.id

    // 2. 창고 재고 등록
    await DB.prepare(`
      INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
      VALUES (?, ?, ?, ?)
    `).bind(tenantId, result.meta.last_row_id, warehouseId, body.current_stock).run()

    // 3. 이동 내역 기록 (창고 ID 포함)
    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason)
      VALUES (?, ?, ?, '입고', ?, '초기 재고')
    `).bind(tenantId, result.meta.last_row_id, warehouseId, body.current_stock).run()
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
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<UpdateProductRequest>()

  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
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
    params.push(body.category || '미분류')
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
  if (body.image_url !== undefined) {
    updates.push('image_url = ?')
    params.push(body.image_url)
  }
  if (body.brand !== undefined) {
    updates.push('brand = ?')
    params.push(body.brand)
  }
  if (body.tags !== undefined) {
    updates.push('tags = ?')
    params.push(body.tags)
  }
  if (body.status !== undefined) {
    updates.push('status = ?')
    params.push(body.status)
  }
  if (body.specifications !== undefined) {
    updates.push('specifications = ?')
    params.push(body.specifications)
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '수정할 내용이 없습니다.' }, 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id, tenantId)

  await DB.prepare(`
    UPDATE products SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
  `).bind(...params).run()

  return c.json({ success: true, message: '상품이 수정되었습니다.' })
})

// 상품 삭제 (비활성화)
app.delete('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  await DB.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run()

  return c.json({ success: true, message: '상품이 삭제되었습니다.' })
})

// 재고 부족 상품 조회
app.get('/alerts/low-stock', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const { results } = await DB.prepare(`
    SELECT * FROM products 
    WHERE is_active = 1 AND current_stock <= min_stock_alert AND tenant_id = ?
    ORDER BY current_stock ASC
  `).bind(tenantId).all<Product>()

  return c.json({ success: true, data: results })
})

// 카테고리 목록 조회
app.get('/meta/categories', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const { results } = await DB.prepare(`
    SELECT DISTINCT category FROM products WHERE is_active = 1 AND tenant_id = ? ORDER BY category
  `).bind(tenantId).all<{ category: string }>()

  return c.json({
    success: true,
    data: results.map((r: { category: string }) => r.category)
  })
})

export default app
