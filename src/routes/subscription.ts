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
            limits: plan.limits
        }
    })
})

export default app
