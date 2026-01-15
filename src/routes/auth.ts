import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { Resend } from 'resend'
import type { Bindings, Variables, User } from '../types'
import { hashPassword, verifyPassword } from '../utils/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 회원가입
app.post('/register', async (c) => {
    const { DB, JWT_SECRET } = c.env
    const body = await c.req.json<{
        email: string;
        password: string;
        name: string;
        phone: string;
        company_name: string;
        plan?: string;
    }>()

    if (!body.email || !body.password || !body.name || !body.phone || !body.company_name) {
        return c.json({ success: false, error: '모든 필드를 입력해주세요.' }, 400)
    }

    // 플랜 유효성 검사 및 기본값 설정
    const allowedPlans = ['FREE', 'BASIC', 'PRO']
    const selectedPlan = body.plan && allowedPlans.includes(body.plan) ? body.plan : 'FREE'

    // 이메일 중복 체크
    const existingUser = await DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first()
    if (existingUser) {
        return c.json({ success: false, error: '이미 존재하는 이메일입니다.' }, 400)
    }

    try {
        // 1. 테넌트 생성
        const tenantResult = await DB.prepare(`
      INSERT INTO tenants (name, plan_type, status) VALUES (?, ?, 'PENDING')
    `).bind(body.company_name, selectedPlan).run()

        const tenantId = tenantResult.meta.last_row_id

        // 2. 사용자 생성
        const passwordHash = await hashPassword(body.password)
        const userResult = await DB.prepare(`
      INSERT INTO users (tenant_id, email, name, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'OWNER')
    `).bind(tenantId, body.email, body.name, body.phone, passwordHash).run()

        const userId = userResult.meta.last_row_id

        // 3. 승인 대기 메시지 반환 (토큰 발급 생략)
        return c.json({
            success: true,
            message: '회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.'
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

    const secret = JWT_SECRET || 'dev-secret-key-1234'

    const accessToken = await sign({
        sub: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        type: 'access',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1시간
    }, secret)

    const refreshToken = await sign({
        sub: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7일
    }, secret)

    // 테넌트 정보 조회
    const tenant = await DB.prepare('SELECT name, logo_url, status FROM tenants WHERE id = ?')
        .bind(user.tenant_id)
        .first<{ name: string; logo_url: string | null; status: string }>()

    if (!tenant || tenant.status !== 'ACTIVE') {
        const statusMsg = tenant?.status === 'PENDING' ? '승인 대기 중' : '비활성화';
        return c.json({ success: false, error: `계정이 ${statusMsg} 상태입니다. 관리자에게 문의하세요.` }, 403)
    }

    return c.json({
        success: true,
        data: {
            token: accessToken,
            refreshToken: refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenant_id: user.tenant_id
            },
            tenant: {
                name: tenant?.name || 'Unknown Company',
                logo_url: tenant?.logo_url
            }
        }
    })
})

// 내 정보 조회
app.get('/me', async (c) => {
    const { DB } = c.env
    const userId = c.get('userId') // 미들웨어에서 설정됨 (auth middleware 필요)

    // 미들웨어가 없거나 userId가 없는 경우 (토큰 검증 실패 등)
    // 현재 구조상 미들웨어가 app.route('/auth') 레벨에 적용되지 않았을 수 있음.
    // 하지만 /me는 인증된 사용자만 접근 가능해야 함.
    // 여기서는 헤더에서 직접 토큰을 파싱하거나, 상위에서 미들웨어를 적용해야 함.
    // index.tsx의 Hono 설정에서 /api/* 에 대해 authMiddleware가 적용되어 있는지 확인 필요.
    // 만약 적용되어 있다면 c.get('userId')를 사용할 수 있음.

    // 안전을 위해 헤더 확인 (미들웨어 의존성 없이 동작하도록)
    try {
        const authHeader = c.req.header('Authorization')
        if (!authHeader) {
            return c.json({ success: false, error: 'Authorization header missing' }, 401)
        }

        // Token parsing (Bearer token)
        const token = authHeader.replace('Bearer ', '')
        if (!token) {
            return c.json({ success: false, error: 'Token missing' }, 401)
        }

        // Verify token manually if needed or rely on middleware if it's reliable.
        // If middleware set userId, use it. If not, try to verify.
        let verifiedUserId = userId;

        if (!verifiedUserId) {
            const { verify } = await import('hono/jwt')
            const { JWT_SECRET } = c.env
            const secret = JWT_SECRET || 'dev-secret-key-1234'
            try {
                const payload = await verify(token, secret) as any
                verifiedUserId = payload.sub
            } catch (err) {
                return c.json({ success: false, error: 'Invalid token' }, 401)
            }
        }

        if (!verifiedUserId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const user = await DB.prepare('SELECT id, email, name, role, tenant_id FROM users WHERE id = ?')
            .bind(verifiedUserId)
            .first<User>()

        if (!user) {
            return c.json({ success: false, error: 'User not found' }, 404)
        }

        const tenant = await DB.prepare('SELECT name, logo_url FROM tenants WHERE id = ?')
            .bind(user.tenant_id)
            .first<{ name: string; logo_url: string | null }>()

        return c.json({
            success: true,
            data: {
                user,
                tenant: {
                    name: tenant?.name || 'Unknown Company',
                    logo_url: tenant?.logo_url
                }
            }
        })
    } catch (e) {
        console.error('/me error:', e)
        return c.json({ success: false, error: 'Server error checkLogin' }, 500)
    }
})

// 토큰 갱신 (Refresh Token 사용)
app.post('/refresh', async (c) => {
    const { JWT_SECRET } = c.env
    const body = await c.req.json<{ refreshToken: string }>()

    if (!body.refreshToken) {
        return c.json({ success: false, error: 'Refresh Token이 필요합니다.' }, 400)
    }

    const secret = JWT_SECRET || 'dev-secret-key-1234'

    try {
        const { verify } = await import('hono/jwt')
        const payload = await verify(body.refreshToken, secret) as any

        // 리프레시 토큰 타입인지 확인
        if (payload.type !== 'refresh') {
            return c.json({ success: false, error: '유효하지 않은 토큰 타입입니다.' }, 401)
        }

        // 새로운 Access Token 발급
        const newAccessToken = await sign({
            sub: payload.sub,
            tenantId: payload.tenantId,
            role: payload.role,
            type: 'access',
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1시간
        }, secret)

        // (선택 사항) Refresh Token Rotation - 보안을 위해 리프레시 토큰도 새로 발급
        const newRefreshToken = await sign({
            sub: payload.sub,
            tenantId: payload.tenantId,
            role: payload.role,
            type: 'refresh',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7일
        }, secret)

        return c.json({
            success: true,
            data: {
                token: newAccessToken,
                refreshToken: newRefreshToken
            }
        })
    } catch (e) {
        return c.json({ success: false, error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.' }, 401)
    }
})

// 아이디(이메일) 찾기
app.post('/find-email', async (c) => {
    const { DB, RESEND_API_KEY } = c.env
    const body = await c.req.json<{
        name: string;
    }>()

    if (!body.name) {
        return c.json({ success: false, error: '이름을 입력해주세요.' }, 400)
    }

    // 이름으로 검색
    const user = await DB.prepare('SELECT email, created_at FROM users WHERE name = ?')
        .bind(body.name)
        .first<{ email: string; created_at: string }>()

    if (!user) {
        return c.json({ success: false, error: '해당 정보로 가입된 계정을 찾을 수 없습니다.' }, 404)
    }

    // 이메일 마스킹 처리
    const emailParts = user.email.split('@')
    const localPart = emailParts[0]
    const maskedLocal = localPart.length > 2
        ? localPart.substring(0, 2) + '***'
        : localPart[0] + '***'
    const maskedEmail = maskedLocal + '@' + emailParts[1]

    try {
        // Resend로 이메일 전송
        if (RESEND_API_KEY) {
            const resend = new Resend(RESEND_API_KEY)

            await resend.emails.send({
                from: 'Stock Manager <onboarding@resend.dev>',  // Resend 기본 발신 주소
                to: [user.email],
                subject: '[Stock Manager] 아이디 찾기 결과',
                html: `
                    <h2>아이디 찾기 결과</h2>
                    <p>안녕하세요, ${body.name}님</p>
                    <p>요청하신 아이디(이메일) 정보입니다:</p>
                    <p style="font-size: 18px; font-weight: bold; color: #4f46e5;">${user.email}</p>
                    <p>가입일: ${new Date(user.created_at).toLocaleDateString('ko-KR')}</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
                `
            })
        }

        return c.json({
            success: true,
            data: {
                maskedEmail: maskedEmail,
                message: '등록된 이메일 주소로 아이디 정보를 전송했습니다.'
            }
        })
    } catch (error) {
        console.error('Email send error:', error)
        // 이메일 전송 실패해도 마스킹된 이메일은 반환
        return c.json({
            success: true,
            data: {
                maskedEmail: maskedEmail,
                message: '아이디를 찾았습니다. (이메일 전송 실패)'
            }
        })
    }
})

// 비밀번호 재설정
app.post('/reset-password', async (c) => {
    const { DB, RESEND_API_KEY } = c.env
    const body = await c.req.json<{
        email: string;
        name: string;
    }>()

    if (!body.email || !body.name) {
        return c.json({ success: false, error: '이메일과 이름을 모두 입력해주세요.' }, 400)
    }

    // 사용자 확인
    const user = await DB.prepare('SELECT id, email, name FROM users WHERE email = ? AND name = ?')
        .bind(body.email, body.name)
        .first<{ id: number; email: string; name: string }>()

    if (!user) {
        return c.json({ success: false, error: '해당 정보로 가입된 계정을 찾을 수 없습니다.' }, 404)
    }

    // 임시 비밀번호 생성 (10자리)
    const tempPassword = Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5).toUpperCase()
    const passwordHash = await hashPassword(tempPassword)

    // 비밀번호 업데이트
    await DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(passwordHash, user.id)
        .run()

    try {
        // Resend로 이메일 전송
        if (RESEND_API_KEY) {
            const resend = new Resend(RESEND_API_KEY)

            await resend.emails.send({
                from: 'Stock Manager <onboarding@resend.dev>',
                to: [user.email],
                subject: '[Stock Manager] 임시 비밀번호 발급',
                html: `
                    <h2>임시 비밀번호 발급</h2>
                    <p>안녕하세요, ${user.name}님</p>
                    <p>요청하신 임시 비밀번호가 발급되었습니다:</p>
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <p style="font-size: 20px; font-weight: bold; color: #4f46e5; font-family: monospace; letter-spacing: 2px;">
                            ${tempPassword}
                        </p>
                    </div>
                    <p style="color: #dc2626; font-weight: bold;">⚠️ 로그인 후 반드시 비밀번호를 변경해주세요.</p>
                    <p>이 임시 비밀번호는 보안을 위해 가능한 빨리 변경하시기 바랍니다.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">본인이 요청하지 않았다면 즉시 고객센터로 문의하세요.</p>
                `
            })

            return c.json({
                success: true,
                data: {
                    message: '등록된 이메일 주소로 임시 비밀번호를 전송했습니다.',
                    emailSent: true
                }
            })
        } else {
            // RESEND_API_KEY가 없는 경우 (개발 환경)
            return c.json({
                success: true,
                data: {
                    tempPassword: tempPassword,
                    message: '임시 비밀번호가 발급되었습니다. (이메일 전송 미설정)',
                    emailSent: false
                }
            })
        }
    } catch (error) {
        console.error('Email send error:', error)
        // 이메일 전송 실패해도 비밀번호는 이미 변경되었으므로 임시 비밀번호 반환
        return c.json({
            success: true,
            data: {
                tempPassword: tempPassword,
                message: '임시 비밀번호가 발급되었습니다. (이메일 전송 실패)',
                emailSent: false
            }
        })
    }
})

export default app
