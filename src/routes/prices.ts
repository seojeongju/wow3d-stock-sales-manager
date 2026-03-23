import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 특정 상품의 모든 특수 가격 정보 조회
app.get('/product/:productId', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const productId = c.req.param('productId')

    const gradePrices = await DB.prepare('SELECT * FROM product_grade_prices WHERE product_id = ? AND tenant_id = ?')
        .bind(productId, tenantId)
        .all()

    const customerPrices = await DB.prepare(`
    SELECT pcp.*, c.name as customer_name, c.phone as customer_phone
    FROM product_customer_prices pcp
    JOIN customers c ON pcp.customer_id = c.id
    WHERE pcp.product_id = ? AND pcp.tenant_id = ?
  `)
        .bind(productId, tenantId)
        .all()

    return c.json({
        success: true,
        data: {
            grade_prices: gradePrices.results,
            customer_prices: customerPrices.results
        }
    })
})

// 모든 특수 가격 정보 일괄 조회 (관리 페이지용)
app.get('/all', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    const gradePrices = await DB.prepare(`
    SELECT pgp.*, p.name as product_name, p.sku as product_sku, p.selling_price as base_price
    FROM product_grade_prices pgp
    JOIN products p ON pgp.product_id = p.id
    WHERE pgp.tenant_id = ?
    ORDER BY p.name ASC
  `).bind(tenantId).all()

    const customerPrices = await DB.prepare(`
    SELECT pcp.*, p.name as product_name, p.sku as product_sku, p.selling_price as base_price,
           c.name as customer_name, c.phone as customer_phone
    FROM product_customer_prices pcp
    JOIN products p ON pcp.product_id = p.id
    JOIN customers c ON pcp.customer_id = c.id
    WHERE pcp.tenant_id = ?
    ORDER BY p.name ASC
  `).bind(tenantId).all()

    return c.json({
        success: true,
        data: {
            grade_prices: gradePrices.results,
            customer_prices: customerPrices.results
        }
    })
})

// 등급별 단가 설정 (upsert)
app.post('/grade', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { product_id, grade, price } = await c.req.json()

    await DB.prepare(`
    INSERT INTO product_grade_prices (tenant_id, product_id, grade, price, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tenant_id, product_id, grade) DO UPDATE SET
      price = excluded.price,
      updated_at = CURRENT_TIMESTAMP
  `).bind(tenantId, product_id, grade, price).run()

    return c.json({ success: true, message: '등급별 단가가 설정되었습니다.' })
})

// 고객별 전용 단가 설정 (upsert)
app.post('/customer', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { product_id, customer_id, price } = await c.req.json()

    await DB.prepare(`
    INSERT INTO product_customer_prices (tenant_id, customer_id, product_id, price, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tenant_id, customer_id, product_id) DO UPDATE SET
      price = excluded.price,
      updated_at = CURRENT_TIMESTAMP
  `).bind(tenantId, customer_id, product_id, price).run()

    return c.json({ success: true, message: '고객별 전용 단가가 설정되었습니다.' })
})

// 특수 단가 삭제 (등급 기준)
app.delete('/grade/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    await DB.prepare('DELETE FROM product_grade_prices WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .run()

    return c.json({ success: true, message: '등급별 단가가 삭제되었습니다.' })
})

// 특수 단가 삭제 (고객 기준)
app.delete('/customer/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    await DB.prepare('DELETE FROM product_customer_prices WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .run()

    return c.json({ success: true, message: '고객 전용 단가가 삭제되었습니다.' })
})

// POS용: 특정 고객에 대한 상품 가격 일괄 조회
// 현재 장바구니에 담긴 모든 상품 ID를 전달받아 최적가를 반환
app.post('/lookup', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { customer_id, product_ids } = await c.req.json()

    // 1. 고객 정보(등급) 확인
    let customerGrade = '일반'
    if (customer_id) {
        const customer = await DB.prepare('SELECT grade FROM customers WHERE id = ? AND tenant_id = ?')
            .bind(customer_id, tenantId)
            .first<{ grade: string }>()
        if (customer) customerGrade = customer.grade
    }

    const results = []

    for (const pid of product_ids) {
        // 우선순위 1: 고객별 지정 단가
        let finalPrice = null
        if (customer_id) {
            const cp = await DB.prepare('SELECT price FROM product_customer_prices WHERE customer_id = ? AND product_id = ? AND tenant_id = ?')
                .bind(customer_id, pid, tenantId)
                .first<{ price: number }>()
            if (cp) finalPrice = cp.price
        }

        // 우선순위 2: 등급별 단가
        if (finalPrice === null) {
            const gp = await DB.prepare('SELECT price FROM product_grade_prices WHERE grade = ? AND product_id = ? AND tenant_id = ?')
                .bind(customerGrade, pid, tenantId)
                .first<{ price: number }>()
            if (gp) finalPrice = gp.price
        }

        // 우선순위 3: 기본 판매가 (실제 가격은 프론트엔드에 이미 있거나, 필요시 여기서 원본 product 조회 가능)
        // 여기서는 특수 가격이 있는 경우만 반환하고, 없으면 null을 보내어 프론트가 기본가를 쓰게 함
        results.push({
            product_id: pid,
            custom_price: finalPrice
        })
    }

    return c.json({
        success: true,
        data: results
    })
})

export default app
