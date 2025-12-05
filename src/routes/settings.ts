import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 회사 정보 조회
app.get('/company', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    const tenant = await DB.prepare('SELECT name, logo_url FROM tenants WHERE id = ?')
        .bind(tenantId)
        .first()

    if (!tenant) {
        return c.json({ success: false, error: 'Tenant not found' }, 404)
    }

    return c.json({
        success: true,
        data: tenant
    })
})

// 회사 정보 수정
app.put('/company', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const body = await c.req.json<{ name: string; logo_url?: string }>()

    if (!body.name) {
        return c.json({ success: false, error: '회사명은 필수입니다.' }, 400)
    }

    await DB.prepare('UPDATE tenants SET name = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(body.name, body.logo_url || null, tenantId)
        .run()

    return c.json({
        success: true,
        message: '회사 정보가 수정되었습니다.'
    })
})

export default app
