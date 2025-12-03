import { Hono } from 'hono'
import type { Bindings, Variables, Sale, CreateSaleRequest } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 판매 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const startDate = c.req.query('startDate') || ''
  const endDate = c.req.query('endDate') || ''
  const customerId = c.req.query('customerId') || ''
  const paymentMethod = c.req.query('paymentMethod') || ''
  const status = c.req.query('status') || 'completed'

  let query = `
    SELECT s.*, c.name as customer_name, c.phone as customer_phone
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.tenant_id = ?
  `
  const params: any[] = [tenantId]

  if (status && status !== 'all') {
    query += ' AND s.status = ?'
    params.push(status)
  }

  if (startDate) {
    query += ' AND DATE(s.created_at) >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND DATE(s.created_at) <= ?'
    params.push(endDate)
  }

  if (customerId) {
    query += ' AND s.customer_id = ?'
    params.push(customerId)
  }

  if (paymentMethod) {
    query += ' AND s.payment_method = ?'
    params.push(paymentMethod)
  }

  query += ' ORDER BY s.created_at DESC'

  // Pagination
  const limit = parseInt(c.req.query('limit') || '0')
  const offset = parseInt(c.req.query('offset') || '0')
  if (limit > 0) {
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }

  const { results } = await DB.prepare(query).bind(...params).all()

  return c.json({ success: true, data: results })
})

// 판매 상세 조회
app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const sale = await DB.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ? AND s.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!sale) {
    return c.json({ success: false, error: '판매 내역을 찾을 수 없습니다.' }, 404)
  }

  // 판매 상품 조회
  const { results: items } = await DB.prepare(`
    SELECT si.*, p.name as product_name, p.sku
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).bind(id).all()

  return c.json({ success: true, data: { ...sale, items } })
})

// 판매 등록
app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<CreateSaleRequest>()

  // 상품 정보 및 재고 확인
  let totalAmount = 0
  const productDetails: any[] = []

  for (const item of body.items) {
    const product = await DB.prepare(`
      SELECT id, name, selling_price, current_stock 
      FROM products 
      WHERE id = ? AND is_active = 1 AND tenant_id = ?
    `).bind(item.product_id, tenantId).first()

    if (!product) {
      return c.json({
        success: false,
        error: `상품 ID ${item.product_id}을(를) 찾을 수 없습니다.`
      }, 400)
    }

    if (product.current_stock < item.quantity) {
      return c.json({
        success: false,
        error: `${product.name}의 재고가 부족합니다. (현재 재고: ${product.current_stock})`
      }, 400)
    }

    const subtotal = product.selling_price * item.quantity
    totalAmount += subtotal

    productDetails.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price: product.selling_price,
      subtotal
    })
  }

  const discountAmount = body.discount_amount || 0
  const finalAmount = totalAmount - discountAmount

  if (finalAmount < 0) {
    return c.json({ success: false, error: '할인 금액이 총액보다 클 수 없습니다.' }, 400)
  }

  // 판매 등록
  const saleResult = await DB.prepare(`
    INSERT INTO sales (tenant_id, customer_id, total_amount, discount_amount, final_amount, payment_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    body.customer_id || null,
    totalAmount,
    discountAmount,
    finalAmount,
    body.payment_method,
    body.notes || null
  ).run()

  const saleId = saleResult.meta.last_row_id

  // 판매 상품 등록 및 재고 차감
  for (const detail of productDetails) {
    // 판매 상세 등록
    await DB.prepare(`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      saleId,
      detail.product_id,
      detail.quantity,
      detail.unit_price,
      detail.subtotal
    ).run()

    // 재고 차감
    await DB.prepare(`
      UPDATE products 
      SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(detail.quantity, detail.product_id, tenantId).run()

    // 재고 이동 기록
    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity, reason, reference_id)
      VALUES (?, ?, '출고', ?, '판매', ?)
    `).bind(tenantId, detail.product_id, -detail.quantity, saleId).run()
  }

  // 고객 구매 금액 및 횟수 업데이트
  if (body.customer_id) {
    await DB.prepare(`
      UPDATE customers 
      SET total_purchase_amount = total_purchase_amount + ?,
          purchase_count = purchase_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(finalAmount, body.customer_id, tenantId).run()
  }

  return c.json({
    success: true,
    data: { id: saleId, final_amount: finalAmount },
    message: '판매가 완료되었습니다.'
  })
})

// 판매 취소
app.put('/:id/cancel', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const sale = await DB.prepare('SELECT * FROM sales WHERE id = ? AND status = ? AND tenant_id = ?')
    .bind(id, 'completed', tenantId)
    .first<Sale>()

  if (!sale) {
    return c.json({ success: false, error: '판매 내역을 찾을 수 없거나 이미 취소되었습니다.' }, 404)
  }

  // 판매 상품 조회
  const { results: items } = await DB.prepare(`
    SELECT * FROM sale_items WHERE sale_id = ?
  `).bind(id).all<any>()

  // 재고 복구
  for (const item of items) {
    await DB.prepare(`
      UPDATE products 
      SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(item.quantity, item.product_id, tenantId).run()

    // 재고 이동 기록
    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity, reason, reference_id)
      VALUES (?, ?, '입고', ?, '판매 취소', ?)
    `).bind(tenantId, item.product_id, item.quantity, id).run()
  }

  // 고객 구매 금액 및 횟수 복구
  if (sale.customer_id) {
    await DB.prepare(`
      UPDATE customers 
      SET total_purchase_amount = total_purchase_amount - ?,
          purchase_count = purchase_count - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(sale.final_amount, sale.customer_id, tenantId).run()
  }

  // 판매 상태 변경
  await DB.prepare(`
    UPDATE sales SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?
  `).bind(id, tenantId).run()

  return c.json({ success: true, message: '판매가 취소되었습니다.' })
})

// 배송 정보 업데이트
app.put('/:id/shipping', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<{
    shipping_address?: string;
    tracking_number?: string;
    courier?: string;
    status?: string;
  }>()

  const updates: string[] = []
  const params: any[] = []

  if (body.shipping_address !== undefined) {
    updates.push('shipping_address = ?')
    params.push(body.shipping_address)
  }
  if (body.tracking_number !== undefined) {
    updates.push('tracking_number = ?')
    params.push(body.tracking_number)
  }
  if (body.courier !== undefined) {
    updates.push('courier = ?')
    params.push(body.courier)
  }
  if (body.status !== undefined) {
    updates.push('status = ?')
    params.push(body.status)
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '수정할 내용이 없습니다.' }, 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await DB.prepare(`
    UPDATE sales SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
  `).bind(...params, tenantId).run()

  return c.json({ success: true, message: '배송 정보가 업데이트되었습니다.' })
})

// 판매 통계
app.get('/stats/summary', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const period = c.req.query('period') || 'today' // today, week, month

  let dateCondition = ''
  switch (period) {
    case 'today':
      dateCondition = "DATE(created_at) = DATE('now', 'localtime')"
      break
    case 'week':
      dateCondition = "DATE(created_at) >= DATE('now', 'localtime', '-7 days')"
      break
    case 'month':
      dateCondition = "DATE(created_at) >= DATE('now', 'localtime', '-30 days')"
      break
    default:
      dateCondition = '1=1'
  }

  const summary = await DB.prepare(`
    SELECT 
      COUNT(*) as total_sales,
      SUM(final_amount) as total_revenue,
      AVG(final_amount) as avg_sale_amount
    FROM sales
    WHERE status = 'completed' AND tenant_id = ? AND ${dateCondition}
  `).bind(tenantId).first()

  return c.json({ success: true, data: summary })
})

// 베스트셀러 상품
app.get('/stats/bestsellers', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const limit = parseInt(c.req.query('limit') || '5')

  const { results } = await DB.prepare(`
    SELECT 
      p.id, p.name, p.sku, p.category,
      SUM(si.quantity) as total_sold,
      SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed' AND s.tenant_id = ?
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT ?
  `).bind(tenantId, limit).all()

  return c.json({ success: true, data: results })
})

export default app
