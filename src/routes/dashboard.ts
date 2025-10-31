import { Hono } from 'hono'
import type { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 대시보드 요약 정보
app.get('/summary', async (c) => {
  const { DB } = c.env

  // 오늘의 매출
  const todaySales = await DB.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as today_revenue,
      COUNT(*) as today_sales_count
    FROM sales
    WHERE status = 'completed' AND DATE(created_at) = DATE('now', 'localtime')
  `).first()

  // 이번 달 매출
  const monthSales = await DB.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as month_revenue,
      COUNT(*) as month_sales_count
    FROM sales
    WHERE status = 'completed' 
    AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `).first()

  // 재고 정보
  const stockInfo = await DB.prepare(`
    SELECT 
      COUNT(*) as total_products,
      SUM(current_stock) as total_stock,
      SUM(current_stock * purchase_price) as total_stock_value,
      COUNT(CASE WHEN current_stock <= min_stock_alert THEN 1 END) as low_stock_count
    FROM products
    WHERE is_active = 1
  `).first()

  // 고객 정보
  const customerInfo = await DB.prepare(`
    SELECT 
      COUNT(*) as total_customers,
      COUNT(CASE WHEN grade = 'VIP' THEN 1 END) as vip_customers
    FROM customers
  `).first()

  return c.json({ 
    success: true, 
    data: {
      today_revenue: todaySales?.today_revenue || 0,
      today_sales_count: todaySales?.today_sales_count || 0,
      month_revenue: monthSales?.month_revenue || 0,
      month_sales_count: monthSales?.month_sales_count || 0,
      total_products: stockInfo?.total_products || 0,
      total_stock: stockInfo?.total_stock || 0,
      total_stock_value: stockInfo?.total_stock_value || 0,
      low_stock_count: stockInfo?.low_stock_count || 0,
      total_customers: customerInfo?.total_customers || 0,
      vip_customers: customerInfo?.vip_customers || 0
    }
  })
})

// 매출 차트 데이터 (최근 7일 또는 30일)
app.get('/sales-chart', async (c) => {
  const { DB } = c.env
  const days = parseInt(c.req.query('days') || '7')

  const { results } = await DB.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as sales_count,
      SUM(final_amount) as revenue
    FROM sales
    WHERE status = 'completed' 
    AND DATE(created_at) >= DATE('now', 'localtime', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).bind(days).all()

  return c.json({ success: true, data: results })
})

// 카테고리별 판매 통계
app.get('/category-stats', async (c) => {
  const { DB } = c.env

  const { results } = await DB.prepare(`
    SELECT 
      p.category,
      COUNT(DISTINCT si.sale_id) as sales_count,
      SUM(si.quantity) as total_quantity,
      SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed'
    GROUP BY p.category
    ORDER BY total_revenue DESC
  `).all()

  return c.json({ success: true, data: results })
})

// 베스트셀러 상품 TOP 5
app.get('/bestsellers', async (c) => {
  const { DB } = c.env
  const limit = parseInt(c.req.query('limit') || '5')

  const { results } = await DB.prepare(`
    SELECT 
      p.id, p.name, p.sku, p.category, p.current_stock,
      SUM(si.quantity) as total_sold,
      SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed'
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT ?
  `).bind(limit).all()

  return c.json({ success: true, data: results })
})

// 최근 판매 내역
app.get('/recent-sales', async (c) => {
  const { DB } = c.env
  const limit = parseInt(c.req.query('limit') || '10')

  const { results } = await DB.prepare(`
    SELECT 
      s.id, s.final_amount, s.payment_method, s.created_at,
      c.name as customer_name,
      COUNT(si.id) as items_count
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE s.status = 'completed'
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT ?
  `).bind(limit).all()

  return c.json({ success: true, data: results })
})

// 재고 부족 경고
app.get('/low-stock-alerts', async (c) => {
  const { DB } = c.env

  const { results } = await DB.prepare(`
    SELECT 
      id, sku, name, category, current_stock, min_stock_alert
    FROM products
    WHERE is_active = 1 AND current_stock <= min_stock_alert
    ORDER BY current_stock ASC
  `).all()

  return c.json({ success: true, data: results })
})

// VIP 고객 목록
app.get('/vip-customers', async (c) => {
  const { DB } = c.env
  const limit = parseInt(c.req.query('limit') || '10')

  const { results } = await DB.prepare(`
    SELECT 
      id, name, phone, grade, total_purchase_amount, purchase_count
    FROM customers
    ORDER BY total_purchase_amount DESC
    LIMIT ?
  `).bind(limit).all()

  return c.json({ success: true, data: results })
})

export default app
