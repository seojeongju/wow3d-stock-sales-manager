/**
 * 창고별 재고(product_warehouse_stocks)가 있으면 합계를, 없으면 products.current_stock을 그대로 씁니다.
 * POS·상품목록과 창고별 현황의 숫자를 맞추기 위한 표시용 재고입니다.
 */
export async function applyDisplayStockFromWarehouses(
  DB: D1Database | any,
  tenantId: number,
  rows: { id: number; current_stock?: number }[]
): Promise<void> {
  if (!rows?.length) return
  const ids = [...new Set(rows.map((r) => r.id).filter(Boolean))]
  if (!ids.length) return

  const placeholders = ids.map(() => '?').join(',')
  const { results: sums } = await DB.prepare(
    `SELECT product_id, COALESCE(SUM(quantity), 0) as s
     FROM product_warehouse_stocks
     WHERE tenant_id = ? AND product_id IN (${placeholders})
     GROUP BY product_id`
  )
    .bind(tenantId, ...ids)
    .all<{ product_id: number; s: number }>()

  const map = new Map<number, number>((sums || []).map((r) => [r.product_id, r.s]))

  for (const r of rows) {
    if (map.has(r.id)) {
      r.current_stock = map.get(r.id)!
    }
  }
}
