import { Hono } from 'hono'
import type { Bindings, StockMovementRequest } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 재고 이동 내역 조회
app.get('/movements', async (c) => {
  const { DB } = c.env
  const productId = c.req.query('productId') || ''
  const movementType = c.req.query('movementType') || ''
  const limit = parseInt(c.req.query('limit') || '50')

  let query = `
    SELECT sm.*, p.name as product_name, p.sku
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE 1=1
  `
  const params: any[] = []

  if (productId) {
    query += ' AND sm.product_id = ?'
    params.push(productId)
  }

  if (movementType) {
    query += ' AND sm.movement_type = ?'
    params.push(movementType)
  }

  query += ' ORDER BY sm.created_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await DB.prepare(query).bind(...params).all()
  
  return c.json({ success: true, data: results })
})

// 특정 상품의 재고 이동 내역
app.get('/movements/:productId', async (c) => {
  const { DB } = c.env
  const productId = c.req.param('productId')

  const { results } = await DB.prepare(`
    SELECT * FROM stock_movements
    WHERE product_id = ?
    ORDER BY created_at DESC
  `).bind(productId).all()

  return c.json({ success: true, data: results })
})

// 재고 입고
app.post('/in', async (c) => {
  const { DB } = c.env
  const body = await c.req.json<StockMovementRequest>()

  if (body.quantity <= 0) {
    return c.json({ success: false, error: '입고 수량은 0보다 커야 합니다.' }, 400)
  }

  // 상품 확인
  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    .bind(body.product_id)
    .first()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  // 재고 증가
  await DB.prepare(`
    UPDATE products 
    SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(body.quantity, body.product_id).run()

  // 재고 이동 기록
  await DB.prepare(`
    INSERT INTO stock_movements (product_id, movement_type, quantity, reason, notes)
    VALUES (?, '입고', ?, ?, ?)
  `).bind(
    body.product_id,
    body.quantity,
    body.reason || '입고',
    body.notes || null
  ).run()

  return c.json({ success: true, message: '입고 처리되었습니다.' })
})

// 재고 출고
app.post('/out', async (c) => {
  const { DB } = c.env
  const body = await c.req.json<StockMovementRequest>()

  if (body.quantity <= 0) {
    return c.json({ success: false, error: '출고 수량은 0보다 커야 합니다.' }, 400)
  }

  // 상품 확인
  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    .bind(body.product_id)
    .first<any>()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  if (product.current_stock < body.quantity) {
    return c.json({ 
      success: false, 
      error: `재고가 부족합니다. (현재 재고: ${product.current_stock})` 
    }, 400)
  }

  // 재고 감소
  await DB.prepare(`
    UPDATE products 
    SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(body.quantity, body.product_id).run()

  // 재고 이동 기록
  await DB.prepare(`
    INSERT INTO stock_movements (product_id, movement_type, quantity, reason, notes)
    VALUES (?, '출고', ?, ?, ?)
  `).bind(
    body.product_id,
    -body.quantity,
    body.reason || '출고',
    body.notes || null
  ).run()

  return c.json({ success: true, message: '출고 처리되었습니다.' })
})

// 재고 조정
app.post('/adjust', async (c) => {
  const { DB } = c.env
  const body = await c.req.json<StockMovementRequest & { new_stock: number }>()

  // 상품 확인
  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    .bind(body.product_id)
    .first<any>()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  const currentStock = product.current_stock
  const newStock = body.new_stock
  const difference = newStock - currentStock

  if (difference === 0) {
    return c.json({ success: false, error: '재고 변동이 없습니다.' }, 400)
  }

  // 재고 조정
  await DB.prepare(`
    UPDATE products 
    SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(newStock, body.product_id).run()

  // 재고 이동 기록
  await DB.prepare(`
    INSERT INTO stock_movements (product_id, movement_type, quantity, reason, notes)
    VALUES (?, '조정', ?, ?, ?)
  `).bind(
    body.product_id,
    difference,
    body.reason || '재고 조정',
    body.notes || `이전 재고: ${currentStock}, 조정 후: ${newStock}`
  ).run()

  return c.json({ 
    success: true, 
    message: '재고가 조정되었습니다.',
    data: { old_stock: currentStock, new_stock: newStock, difference }
  })
})

// 재고 현황 요약
app.get('/summary', async (c) => {
  const { DB } = c.env

  const summary = await DB.prepare(`
    SELECT 
      COUNT(*) as total_products,
      SUM(current_stock) as total_stock,
      SUM(current_stock * purchase_price) as total_stock_value,
      COUNT(CASE WHEN current_stock <= min_stock_alert THEN 1 END) as low_stock_count
    FROM products
    WHERE is_active = 1
  `).first()

  return c.json({ success: true, data: summary })
})

export default app
