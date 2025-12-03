import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import type { Bindings, User } from '../types'
import { hashPassword, verifyPassword } from '../utils/auth'

const app = new Hono<{ Bindings: Bindings }>()

// 회원가입
app.post('/register', async (c) => {
    const { DB, JWT_SECRET } = c.env
    const body = await c.req.json<{
        email: string;
        password: string;
        name: string;
        company_name: string;
    }>()

    if (!body.email || !body.password || !body.name || !body.company_name) {
        return c.json({ success: false, error: '모든 필드를 입력해주세요.' }, 400)
    }

    // 이메일 중복 체크
    const existingUser = await DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first()
    if (existingUser) {
        return c.json({ success: false, error: '이미 존재하는 이메일입니다.' }, 400)
    }

    try {
        // 1. 테넌트 생성
        const tenantResult = await DB.prepare(`
      INSERT INTO tenants (name, plan_type) VALUES (?, 'FREE')
    `).bind(body.company_name).run()

        const tenantId = tenantResult.meta.last_row_id

        // 2. 사용자 생성
        const passwordHash = await hashPassword(body.password)
        const userResult = await DB.prepare(`
      INSERT INTO users (tenant_id, email, name, password_hash, role)
      VALUES (?, ?, ?, ?, 'OWNER')
    `).bind(tenantId, body.email, body.name, passwordHash).run()

        const userId = userResult.meta.last_row_id

        // 3. JWT 발급
        const payload = {
            sub: userId,
            tenantId: tenantId,
            role: 'OWNER',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7일 유효
        }

        // JWT_SECRET이 없는 경우 대비 (개발용 기본값)
        const secret = JWT_SECRET || 'dev-secret-key-1234'
        const token = await sign(payload, secret)

        return c.json({
            success: true,
            data: {
                token,
                user: { id: userId, email: body.email, name: body.name, role: 'OWNER', tenant_id: tenantId }
            }
        })

    } catch (e) {
        console.error(e)
        return c.json({ success: false, error: '회원가입 중 오류가 발생했습니다.' }, 500)
    }
})

// 로그인
app.post('/login', async (c) => {
    const { DB, JWT_SECRET } = c.env
    const body = await c.req.json<{
        email: string;
        password: string;
    }>()

    if (!body.email || !body.password) {
        return c.json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' }, 400)
    }

    const user = await DB.prepare('SELECT * FROM users WHERE email = ?').bind(body.email).first<User>()

    if (!user || !user.password_hash) {
        return c.json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    const isValid = await verifyPassword(body.password, user.password_hash)

    if (!isValid) {
        return c.json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    const payload = {
        sub: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7일
    }

    const secret = JWT_SECRET || 'dev-secret-key-1234'
    const token = await sign(payload, secret)

    return c.json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenant_id: user.tenant_id
            }
        }
    })
})

// 내 정보 조회
app.get('/me', async (c) => {
    // 미들웨어에서 검증된 사용자 정보 사용 (아직 미들웨어 연결 안됨, 추후 수정)
    // 여기서는 토큰 검증 로직이 필요하거나, 미들웨어를 거친 후 실행되어야 함.
    // 일단은 미들웨어 구현 후 연동 예정.
    return c.json({ success: true, message: 'Not implemented yet' })
})

export default app
