import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { PLANS, PlanType } from '../constants/plans'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    // 1. Get Tenant Info
    const tenant = await DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(tenantId).first<any>()

    if (!tenant) {
        return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    const planType = (tenant.plan_type as PlanType) || 'FREE'
    const plan = PLANS[planType]

    // 2. Get Usage
    const productCount = await DB.prepare('SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND is_active = 1').bind(tenantId).first<number>('count') || 0
    const userCount = await DB.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').bind(tenantId).first<number>('count') || 0
    const storageUsage = 0 // TODO: Implement storage calculation if needed

    // 3. Get Pending Request
    const pendingRequest = await DB.prepare(
        "SELECT * FROM plan_change_requests WHERE tenant_id = ? AND status = 'PENDING'"
    ).bind(tenantId).first();

    return c.json({
        success: true,
        data: {
            plan: {
                type: planType,
                name: plan.name,
                price: plan.price,
                features: plan.features
            },
            usage: {
                products: productCount,
                users: userCount,
                storage: storageUsage
            },
            limits: plan.limits,
            pendingRequest: pendingRequest ? {
                id: pendingRequest.id,
                requested_plan: pendingRequest.requested_plan,
                requested_at: pendingRequest.requested_at
            } : null
        }
    })
})

// 플랜 변경 요청
app.post('/request', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const { requestedPlan } = await c.req.json()

    if (!['FREE', 'BASIC', 'PRO'].includes(requestedPlan)) {
        return c.json({ success: false, error: 'Invalid plan type' }, 400)
    }

    try {
        // 현재 플랜 확인
        const tenant = await DB.prepare('SELECT plan_type FROM tenants WHERE id = ?').bind(tenantId).first<{ plan_type: string }>()
        if (tenant?.plan_type === requestedPlan) {
            return c.json({ success: false, error: 'Current plan is same as requested plan' }, 400)
        }

        // 이미 대기 중인 요청이 있는지 확인
        const existing = await DB.prepare(
            "SELECT id FROM plan_change_requests WHERE tenant_id = ? AND status = 'PENDING'"
        ).bind(tenantId).first()

        if (existing) {
            return c.json({ success: false, error: '이미 처리 대기 중인 변경 요청이 있습니다.' }, 400)
        }

        await DB.prepare(`
            INSERT INTO plan_change_requests (tenant_id, request_user_id, current_plan, requested_plan)
            VALUES (?, ?, ?, ?)
        `).bind(tenantId, userId, tenant?.plan_type || 'FREE', requestedPlan).run()

        return c.json({ success: true, message: '플랜 변경 요청이 접수되었습니다.' })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

export default app
