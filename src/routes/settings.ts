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

// 시스템 설정 조회 (전체)
app.get('/system', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    try {
        const { results } = await DB.prepare(`
            SELECT id, setting_key, setting_value, description, is_encrypted, updated_at
            FROM settings
            WHERE tenant_id = ?
            ORDER BY setting_key
        `).bind(tenantId).all()

        return c.json({ success: true, data: results })
    } catch (error: any) {
        console.error('Get settings error:', error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// 시스템 설정 조회 (단일)
app.get('/system/:key', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { key } = c.req.param()

    try {
        const setting = await DB.prepare(`
            SELECT setting_key, setting_value, description
            FROM settings
            WHERE tenant_id = ? AND setting_key = ?
        `).bind(tenantId, key).first()

        if (!setting) {
            return c.json({ success: false, error: '설정을 찾을 수 없습니다.' }, 404)
        }

        return c.json({ success: true, data: setting })
    } catch (error: any) {
        console.error('Get setting error:', error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// 시스템 설정 저장/업데이트
app.put('/system/:key', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { key } = c.req.param()
    const body = await c.req.json<{
        value: string
        description?: string
    }>()

    try {
        // 기존 설정 확인
        const existing = await DB.prepare(`
            SELECT id FROM settings WHERE tenant_id = ? AND setting_key = ?
        `).bind(tenantId, key).first()

        if (existing) {
            // 업데이트
            await DB.prepare(`
                UPDATE settings 
                SET setting_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE tenant_id = ? AND setting_key = ?
            `).bind(body.value, body.description || null, tenantId, key).run()
        } else {
            // 신규 생성
            await DB.prepare(`
                INSERT INTO settings (tenant_id, setting_key, setting_value, description)
                VALUES (?, ?, ?, ?)
            `).bind(tenantId, key, body.value, body.description || null).run()
        }

        return c.json({
            success: true,
            message: '설정이 저장되었습니다.'
        })

    } catch (error: any) {
        console.error('Save setting error:', error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// 시스템 설정 삭제
app.delete('/system/:key', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { key } = c.req.param()

    try {
        await DB.prepare(`
            DELETE FROM settings WHERE tenant_id = ? AND setting_key = ?
        `).bind(tenantId, key).run()

        return c.json({
            success: true,
            message: '설정이 삭제되었습니다.'
        })

    } catch (error: any) {
        console.error('Delete setting error:', error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

export default app
