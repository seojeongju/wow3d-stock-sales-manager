import { Hono } from 'hono'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 모든 테넌트 조회
app.get('/tenants', async (c) => {
    try {
        const { results } = await c.env.DB.prepare(
            `SELECT t.*, 
            (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count,
            (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id) as product_count
            FROM tenants t 
            ORDER BY t.created_at DESC`
        ).all()
        return c.json({ success: true, data: results })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 모든 사용자 조회 (테넌트 정보 포함)
app.get('/users', async (c) => {
    try {
        const { results } = await c.env.DB.prepare(
            `SELECT u.id, u.email, u.name, u.role, u.created_at, t.name as tenant_name 
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            ORDER BY u.created_at DESC`
        ).all()
        return c.json({ success: true, data: results })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 테넌트 생성
app.post('/tenants', async (c) => {
    const { name, plan } = await c.req.json()
    try {
        const { results } = await c.env.DB.prepare(
            `INSERT INTO tenants (name, plan, status) VALUES (?, ?, 'ACTIVE') RETURNING id`
        ).bind(name, plan || 'BASIC').all()
        return c.json({ success: true, data: results[0] })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 시스템 통계
app.get('/stats', async (c) => {
    try {
        const tenantCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tenants').first('count')
        const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count')
        const activeTenants = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'ACTIVE'").first('count')

        return c.json({
            success: true, data: {
                total_tenants: tenantCount,
                active_tenants: activeTenants,
                total_users: userCount
            }
        })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

export default app
