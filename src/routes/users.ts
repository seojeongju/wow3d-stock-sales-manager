import { Hono } from 'hono'
import type { Bindings, Variables, User } from '../types'
import { checkPlanLimit } from '../utils/subscription'
import { hashPassword } from '../utils/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 현재 사용자 정보 조회
app.get('/me', async (c) => {
    const { DB } = c.env
    const userId = c.get('userId')

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const user = await DB.prepare(`
        SELECT u.*, t.name as tenant_name, t.plan_type 
        FROM users u 
        JOIN tenants t ON u.tenant_id = t.id 
        WHERE u.id = ?
    `).bind(userId).first()

    if (!user) {
        return c.json({ success: false, error: 'User not found' }, 404)
    }

    return c.json({ success: true, data: user })
})

// 사용자 목록 조회 (같은 테넌트)
app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    const { results } = await DB.prepare(`
        SELECT id, email, name, role, created_at 
        FROM users 
        WHERE tenant_id = ?
        ORDER BY created_at DESC
    `).bind(tenantId).all()

    return c.json({ success: true, data: results })
})

// 사용자 추가 (초대)
app.post('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const userRole = c.get('userRole') // 미들웨어에서 설정 필요 (현재는 토큰에서 가져옴)

    // 권한 체크 (OWNER or ADMIN)
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return c.json({ success: false, error: '권한이 없습니다.' }, 403)
    }

    const body = await c.req.json<{
        email: string;
        name: string;
        password: string;
        role?: 'ADMIN' | 'USER';
    }>()

    if (!body.email || !body.name || !body.password) {
        return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }

    // 플랜 한도 체크
    const limitCheck = await checkPlanLimit(DB, tenantId, 'users')
    if (!limitCheck.allowed) {
        return c.json({ success: false, error: limitCheck.error }, 403)
    }

    // 이메일 중복 체크
    const existing = await DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first()
    if (existing) {
        return c.json({ success: false, error: '이미 존재하는 이메일입니다.' }, 400)
    }

    try {
        const passwordHash = await hashPassword(body.password)

        await DB.prepare(`
            INSERT INTO users (tenant_id, email, name, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            tenantId,
            body.email,
            body.name,
            passwordHash,
            body.role || 'USER'
        ).run()

        return c.json({ success: true, message: '사용자가 추가되었습니다.' })
    } catch (e) {
        console.error(e)
        return c.json({ success: false, error: '사용자 추가 중 오류가 발생했습니다.' }, 500)
    }
})

// 사용자 삭제
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const myId = c.get('userId')
    const myRole = c.get('userRole')
    const targetId = c.req.param('id')

    if (myRole !== 'OWNER') {
        return c.json({ success: false, error: '권한이 없습니다.' }, 403)
    }

    if (String(myId) === targetId) {
        return c.json({ success: false, error: '자기 자신은 삭제할 수 없습니다.' }, 400)
    }

    await DB.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?')
        .bind(targetId, tenantId)
        .run()

    return c.json({ success: true, message: '사용자가 삭제되었습니다.' })
})

export default app
