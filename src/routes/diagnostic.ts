import { Hono } from 'hono'
import { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 판매-출고 연결 진단
app.get('/diagnose/:saleId', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const saleId = c.req.param('saleId')

  try {
    // 1. 판매 정보 확인
    const sale = await DB.prepare(`
      SELECT id, courier, tracking_number, created_at
      FROM sales 
      WHERE id = ? AND tenant_id = ?
    `).bind(saleId, tenantId).first()

    // 2. 출고 매핑 확인
    const { results: mappings } = await DB.prepare(`
      SELECT * FROM outbound_order_mappings 
      WHERE sale_id = ?
    `).bind(saleId).all()

    // 3. 연결된 출고 주문 확인
    const { results: outbounds } = await DB.prepare(`
      SELECT oo.* 
      FROM outbound_orders oo
      JOIN outbound_order_mappings oom ON oo.id = oom.outbound_order_id
      WHERE oom.sale_id = ?
    `).bind(saleId).all()

    // 4. 연결된 패키지 확인
    const { results: packages } = await DB.prepare(`
      SELECT op.* 
      FROM outbound_packages op
      JOIN outbound_order_mappings oom ON op.outbound_order_id = oom.outbound_order_id
      WHERE oom.sale_id = ?
    `).bind(saleId).all()

    // 5. 모든 출고 패키지 확인 (참고용)
    const { results: allPackages } = await DB.prepare(`
      SELECT op.*, oo.order_number, oom.sale_id
      FROM outbound_packages op
      JOIN outbound_orders oo ON op.outbound_order_id = oo.id
      LEFT JOIN outbound_order_mappings oom ON oo.id = oom.outbound_order_id
      WHERE oo.tenant_id = ?
      LIMIT 10
    `).bind(tenantId).all()

    return c.json({
      success: true,
      data: {
        sale,
        mappings,
        outbounds,
        packages,
        allPackages,
        diagnosis: {
          hasSaleTracking: !!(sale?.tracking_number),
          hasMappings: mappings.length > 0,
          hasOutbounds: outbounds.length > 0,
          hasPackages: packages.length > 0
        }
      }
    })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

// API 키 확인
app.get('/check-api-key', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  try {
    const settingRow = await DB.prepare(`
      SELECT setting_key, setting_value FROM settings 
      WHERE tenant_id = ? AND setting_key = 'sweettracker_api_key'
    `).bind(tenantId).first<{ setting_key: string; setting_value: string }>()

    return c.json({
      success: true,
      data: {
        hasApiKey: !!settingRow,
        apiKeyLength: settingRow?.setting_value?.length || 0,
        apiKeyPreview: settingRow?.setting_value ?
          settingRow.setting_value.substring(0, 8) + '...' : null
      }
    })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

// 판매와 출고 수동 연결
app.post('/link', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { sale_id, outbound_order_id } = await c.req.json()

  try {
    // 판매가 해당 테넌트 것인지 확인
    const sale = await DB.prepare(`
      SELECT id FROM sales WHERE id = ? AND tenant_id = ?
    `).bind(sale_id, tenantId).first()

    if (!sale) {
      return c.json({ success: false, error: '판매를 찾을 수 없습니다.' }, 404)
    }

    // 출고 주문이 해당 테넌트 것인지 확인
    const outbound = await DB.prepare(`
      SELECT id FROM outbound_orders WHERE id = ? AND tenant_id = ?
    `).bind(outbound_order_id, tenantId).first()

    if (!outbound) {
      return c.json({ success: false, error: '출고 주문을 찾을 수 없습니다.' }, 404)
    }

    // 매핑 생성
    await DB.prepare(`
      INSERT INTO outbound_order_mappings (outbound_order_id, sale_id)
      VALUES (?, ?)
    `).bind(outbound_order_id, sale_id).run()

    return c.json({ success: true, message: '판매와 출고가 연결되었습니다.' })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

// 자동 동기화: 전화번호 기반으로 판매와 출고 자동 매칭 + sales 테이블 업데이트
app.post('/auto-sync', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  try {
    // 1. 전화번호 기반으로 매핑 생성
    const createMappings = await DB.prepare(`
      INSERT INTO outbound_order_mappings (outbound_order_id, sale_id)
      SELECT DISTINCT 
        oo.id as outbound_order_id,
        s.id as sale_id
      FROM outbound_orders oo
      JOIN sales s ON s.tenant_id = ?
      JOIN customers c ON s.customer_id = c.id
      WHERE oo.tenant_id = ?
        AND oo.destination_phone IS NOT NULL
        AND c.phone IS NOT NULL
        AND (
          REPLACE(REPLACE(REPLACE(oo.destination_phone, '-', ''), ' ', ''), '+82', '0') = 
          REPLACE(REPLACE(REPLACE(c.phone, '-', ''), ' ', ''), '+82', '0')
        )
        AND DATE(oo.created_at) >= DATE(s.created_at, '-1 day')
        AND DATE(oo.created_at) <= DATE(s.created_at, '+3 days')
        AND NOT EXISTS (
          SELECT 1 FROM outbound_order_mappings oom2 
          WHERE oom2.outbound_order_id = oo.id 
          AND oom2.sale_id = s.id
        )
    `).bind(tenantId, tenantId).run()

    // 2. sales 테이블에 운송장 정보 업데이트
    const updateSales = await DB.prepare(`
      UPDATE sales
      SET 
        courier = (
          SELECT op.courier 
          FROM outbound_order_mappings oom
          JOIN outbound_packages op ON oom.outbound_order_id = op.outbound_order_id
          WHERE oom.sale_id = sales.id
          AND op.courier IS NOT NULL
          LIMIT 1
        ),
        tracking_number = (
          SELECT op.tracking_number 
          FROM outbound_order_mappings oom
          JOIN outbound_packages op ON oom.outbound_order_id = op.outbound_order_id
          WHERE oom.sale_id = sales.id
          AND op.tracking_number IS NOT NULL
          LIMIT 1
        )
      WHERE tenant_id = ?
        AND EXISTS (
          SELECT 1 
          FROM outbound_order_mappings oom
          JOIN outbound_packages op ON oom.outbound_order_id = op.outbound_order_id
          WHERE oom.sale_id = sales.id
          AND op.tracking_number IS NOT NULL
        )
    `).bind(tenantId).run()

    // 3. 결과 확인
    const { results: updated } = await DB.prepare(`
      SELECT 
        s.id,
        c.name as customer_name,
        s.courier,
        s.tracking_number
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.tenant_id = ?
        AND s.tracking_number IS NOT NULL
      ORDER BY s.created_at DESC
      LIMIT 20
    `).bind(tenantId).all()

    return c.json({
      success: true,
      message: '자동 동기화가 완료되었습니다.',
      data: {
        mappingsCreated: createMappings.meta.changes,
        salesUpdated: updateSales.meta.changes,
        updatedSales: updated
      }
    })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

// 테이블 스키마 확인
app.get('/schema/:tableName', async (c) => {
  const { DB } = c.env
  const tableName = c.req.param('tableName')

  try {
    const { results } = await DB.prepare(`PRAGMA table_info(${tableName})`).all()
    return c.json({ success: true, data: results })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

export default app
