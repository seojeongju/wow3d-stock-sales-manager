import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 대시보드 요약 정보
app.get('/summary', async (c) => {
  const { DB } = c.env

  const tenantId = c.get('tenantId')

  // 오늘의 매출
  const todaySales = await DB.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as today_revenue,
      COUNT(*) as today_sales_count
    FROM sales
    WHERE tenant_id = ? AND status = 'completed' AND DATE(created_at) = DATE('now', 'localtime')
  `).bind(tenantId).first()

  // 이번 달 매출
  const monthSales = await DB.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as month_revenue,
      COUNT(*) as month_sales_count
    FROM sales
    WHERE tenant_id = ? AND status = 'completed' 
    AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `).bind(tenantId).first()

  // 재고 정보
  const stockInfo = await DB.prepare(`
    SELECT 
      COUNT(*) as total_products,
      SUM(current_stock) as total_stock,
      SUM(current_stock * purchase_price) as total_stock_value,
      COUNT(CASE WHEN current_stock <= min_stock_alert THEN 1 END) as low_stock_count
    FROM products
    WHERE tenant_id = ? AND is_active = 1
  `).bind(tenantId).first()

  // 고객 정보
  const customerInfo = await DB.prepare(`
    SELECT 
      COUNT(*) as total_customers,
      COUNT(CASE WHEN grade = 'VIP' THEN 1 END) as vip_customers
    FROM customers
    WHERE tenant_id = ?
  `).bind(tenantId).first()

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

// 매출 차트 데이터 (기간별)
app.get('/sales-chart', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const period = c.req.query('period') || 'daily' // daily, monthly
  const range = parseInt(c.req.query('range') || '30') // days to look back

  let groupBy = "DATE(created_at)"
  let dateSelect = "DATE(created_at) as date"
  // SQLite date modifier for range
  let timeModifier = `-${range} days`

  if (period === 'monthly') {
    groupBy = "strftime('%Y-%m', created_at)"
    dateSelect = "strftime('%Y-%m', created_at) as date"
    timeModifier = `-${range} days` // We still use days for the filter window, e.g. 365 days for yearly view
  }

  const { results } = await DB.prepare(`
    SELECT 
      ${dateSelect},
      COUNT(*) as sales_count,
      SUM(final_amount) as revenue
    FROM sales
    WHERE tenant_id = ? AND status = 'completed' 
    AND created_at >= DATE('now', 'localtime', ?)
    GROUP BY ${groupBy}
    ORDER BY date ASC
  `).bind(tenantId, timeModifier).all()

  return c.json({ success: true, data: results })
})

// ... (existing endpoints) ...

// Profit Insight (순이익 분석)
app.get('/profit-chart', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const period = c.req.query('period') || 'daily'
  const range = parseInt(c.req.query('range') || '30')

  let groupBy = "DATE(s.created_at)"
  let dateSelect = "DATE(s.created_at) as date"
  let timeModifier = `-${range} days`

  if (period === 'monthly') {
    groupBy = "strftime('%Y-%m', s.created_at)"
    dateSelect = "strftime('%Y-%m', s.created_at) as date"
  }

  const { results } = await DB.prepare(`
    SELECT 
      ${dateSelect},
      SUM(s.final_amount) as revenue,
      SUM(si.quantity * p.purchase_price) as cost,
      (SUM(s.final_amount) - SUM(si.quantity * p.purchase_price)) as profit
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    JOIN products p ON si.product_id = p.id
    WHERE s.tenant_id = ? AND s.status = 'completed'
      AND s.created_at >= DATE('now', 'localtime', ?)
    GROUP BY ${groupBy}
    ORDER BY date ASC
  `).bind(tenantId, timeModifier).all()

  return c.json({ success: true, data: results })
})

// 재고 건전성 분석 (Dead Stock)
app.get('/inventory-health', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const days = parseInt(c.req.query('days') || '30') // N일 동안 판매 없음

  // 최근 N일간 판매된 상품 ID 목록
  // NOT IN 을 사용하여 판매되지 않은 상품 조회
  const { results } = await DB.prepare(`
    SELECT 
      p.id, p.name, p.sku, p.category, p.current_stock, p.purchase_price, p.image_url,
      (p.current_stock * p.purchase_price) as stock_value,
      MAX(s.created_at) as last_sold_at
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id AND s.status = 'completed'
    WHERE p.tenant_id = ? 
      AND p.is_active = 1 
      AND p.current_stock > 0
    GROUP BY p.id
    HAVING (last_sold_at < DATE('now', 'localtime', '-' || ? || ' days') OR last_sold_at IS NULL)
    ORDER BY stock_value DESC
    LIMIT 10
  `).bind(tenantId, days).all()

  return c.json({ success: true, data: results })
})

export default app
