import { Hono } from 'hono'
import { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

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
            `INSERT INTO tenants (name, plan_type, status) VALUES (?, ?, 'ACTIVE') RETURNING id`
        ).bind(name, plan || 'BASIC').all()
        return c.json({ success: true, data: results[0] })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 테넌트 수정
app.put('/tenants/:id', async (c) => {
    const id = c.req.param('id')
    const { name, plan_type, status } = await c.req.json()
    try {
        await c.env.DB.prepare(
            `UPDATE tenants SET name = ?, plan_type = ?, status = ? WHERE id = ?`
        ).bind(name, plan_type, status, id).run()
        return c.json({ success: true })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 테넌트 삭제
app.delete('/tenants/:id', async (c) => {
    const id = c.req.param('id')
    try {
        // 관련된 데이터 삭제 (Cascade 삭제가 설정되어 있지 않은 경우를 대비해 수동 삭제)
        await c.env.DB.prepare('DELETE FROM plan_change_requests WHERE tenant_id = ?').bind(id).run()
        await c.env.DB.prepare('DELETE FROM products WHERE tenant_id = ?').bind(id).run()
        await c.env.DB.prepare('DELETE FROM users WHERE tenant_id = ?').bind(id).run()
        await c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(id).run()

        return c.json({ success: true })
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

// 플랜 변경 요청 목록 조회
app.get('/plan-requests', async (c) => {
    try {
        const { results } = await c.env.DB.prepare(
            `SELECT r.*, t.name as tenant_name, u.name as user_name, u.email as user_email
            FROM plan_change_requests r
            JOIN tenants t ON r.tenant_id = t.id
            LEFT JOIN users u ON r.request_user_id = u.id
            WHERE r.status = 'PENDING'
            ORDER BY r.requested_at DESC`
        ).all()
        return c.json({ success: true, data: results })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 플랜 변경 요청 승인
app.post('/plan-requests/:id/approve', async (c) => {
    const id = c.req.param('id')
    const adminId = c.get('userId')
    try {
        // 1. 요청 정보 조회
        const request = await c.env.DB.prepare('SELECT * FROM plan_change_requests WHERE id = ?').bind(id).first<any>()
        if (!request || request.status !== 'PENDING') {
            return c.json({ success: false, error: '유효하지 않은 요청입니다.' }, 400)
        }

        // 2. 테넌트 플랜 업데이트
        await c.env.DB.prepare('UPDATE tenants SET plan_type = ? WHERE id = ?')
            .bind(request.requested_plan, request.tenant_id).run()

        // 3. 요청 상태 업데이트
        await c.env.DB.prepare(
            "UPDATE plan_change_requests SET status = 'APPROVED', processed_at = CURRENT_TIMESTAMP, processed_by = ? WHERE id = ?"
        ).bind(adminId, id).run()

        return c.json({ success: true, message: '플랜 변경이 승인되었습니다.' })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 플랜 변경 요청 거절
app.post('/plan-requests/:id/reject', async (c) => {
    const id = c.req.param('id')
    const adminId = c.get('userId')
    try {
        await c.env.DB.prepare(
            "UPDATE plan_change_requests SET status = 'REJECTED', processed_at = CURRENT_TIMESTAMP, processed_by = ? WHERE id = ?"
        ).bind(adminId, id).run()

        return c.json({ success: true, message: '플랜 변경 요청이 거절되었습니다.' })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 특정 테넌트의 사용자 목록 조회
app.get('/tenants/:id/users', async (c) => {
    const id = c.req.param('id')
    try {
        const { results } = await c.env.DB.prepare(
            `SELECT id, email, name, role, created_at FROM users WHERE tenant_id = ? ORDER BY role DESC, created_at DESC`
        ).bind(id).all()
        return c.json({ success: true, data: results })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 사용자 비밀번호 변경 (슈퍼관리자 권한)
app.post('/users/:id/password', async (c) => {
    const id = c.req.param('id')
    const { newPassword } = await c.req.json<{ newPassword: string }>()

    if (!newPassword || newPassword.length < 4) {
        return c.json({ success: false, error: '비밀번호는 최소 4자 이상이어야 합니다.' }, 400)
    }

    try {
        const { hashPassword } = await import('../utils/auth')
        const passwordHash = await hashPassword(newPassword)

        await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(passwordHash, id)
            .run()

        return c.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

// 사용자 역할 변경
app.put('/users/:id/role', async (c) => {
    const id = c.req.param('id')
    const { role } = await c.req.json<{ role: string }>()

    if (!['OWNER', 'ADMIN', 'staff'].includes(role)) {
        return c.json({ success: false, error: '유효하지 않은 역할입니다.' }, 400)
    }

    try {
        await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(role, id)
            .run()

        return c.json({ success: true, message: '역할이 변경되었습니다.' })
    } catch (e) {
        return c.json({ success: false, error: (e as Error).message }, 500)
    }
})

export default app
