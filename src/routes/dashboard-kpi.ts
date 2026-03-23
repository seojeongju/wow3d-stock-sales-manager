import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// KPI 대시보드 (오늘 vs 어제 비교)
app.get('/kpi-comparison', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    // 오늘 데이터
    const today = await DB.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as revenue,
      COUNT(*) as order_count,
      COALESCE(AVG(final_amount), 0) as avg_order_value
    FROM sales
    WHERE tenant_id = ? AND status = 'completed' 
      AND DATE(created_at) = DATE('now', 'localtime')
  `).bind(tenantId).first()

    // 어제 데이터
    const yesterday = await DB.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as revenue,
      COUNT(*) as order_count,
      COALESCE(AVG(final_amount), 0) as avg_order_value
    FROM sales
    WHERE tenant_id = ? AND status = 'completed' 
      AND DATE(created_at) = DATE('now', 'localtime', '-1 day')
  `).bind(tenantId).first()

    // 재고 회전율 계산 (평균 재고 / 일평균 판매량)
    const turnoverData = await DB.prepare(`
    SELECT 
      AVG(p.current_stock) as avg_stock,
      COALESCE(AVG(daily_sales.daily_qty), 0) as avg_daily_sales
    FROM products p
    LEFT JOIN (
      SELECT 
        si.product_id,
        SUM(si.quantity) / 30.0 as daily_qty
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.tenant_id = ? AND s.status = 'completed'
        AND s.created_at >= DATE('now', 'localtime', '-30 days')
      GROUP BY si.product_id
    ) daily_sales ON p.id = daily_sales.product_id
    WHERE p.tenant_id = ? AND p.is_active = 1
  `).bind(tenantId, tenantId).first()

    // 매출 목표 (이번 달 목표는 하드코딩, 추후 설정 기능 추가 가능)
    const monthTarget = 10000000 // 1000만원 (추후 DB에서 가져오기)
    const monthRevenueRaw = await DB.prepare(`
    SELECT COALESCE(SUM(final_amount), 0) as revenue
    FROM sales
    WHERE tenant_id = ? AND status = 'completed'
      AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `).bind(tenantId).first()

    const monthRevenue = (monthRevenueRaw?.revenue as number) || 0

    // 증감률 계산 함수
    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
    }

    const todayRevenue = (today?.revenue as number) || 0
    const todayOrderCount = (today?.order_count as number) || 0
    const todayAvgOrder = (today?.avg_order_value as number) || 0
    const yesterdayRevenue = (yesterday?.revenue as number) || 0
    const yesterdayOrderCount = (yesterday?.order_count as number) || 0
    const yesterdayAvgOrder = (yesterday?.avg_order_value as number) || 0

    // 재고 회전일 계산 (평균 재고 / 일평균 판매량)
    const avgStock = (turnoverData?.avg_stock as number) || 0
    const avgDailySales = (turnoverData?.avg_daily_sales as number) || 0
    const turnoverDays = avgDailySales > 0 ? Math.round(avgStock / avgDailySales) : 0

    return c.json({
        success: true,
        data: {
            today_revenue: todayRevenue,
            yesterday_revenue: yesterdayRevenue,
            revenue_change: calculateChange(todayRevenue, yesterdayRevenue),

            today_order_count: todayOrderCount,
            yesterday_order_count: yesterdayOrderCount,
            order_count_change: calculateChange(todayOrderCount, yesterdayOrderCount),

            today_avg_order: todayAvgOrder,
            yesterday_avg_order: yesterdayAvgOrder,
            avg_order_change: calculateChange(todayAvgOrder, yesterdayAvgOrder),

            turnover_days: turnoverDays,

            month_target: monthTarget,
            month_revenue: monthRevenue,
            target_achievement: monthTarget > 0 ? (monthRevenue / monthTarget) * 100 : 0
        }
    })
})

export default app
