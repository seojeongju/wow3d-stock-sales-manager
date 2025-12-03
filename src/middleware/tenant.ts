import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

export const tenantMiddleware = async (c: Context, next: Next) => {
    // 인증이 필요 없는 경로 제외
    if (c.req.path.startsWith('/api/auth')) {
        await next()
        return
    }

    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, error: '인증이 필요합니다.' }, 401)
    }

    const token = authHeader.split(' ')[1]
    const secret = c.env.JWT_SECRET || 'dev-secret-key-1234'

    try {
        const payload = await verify(token, secret)

        // 컨텍스트에 저장
        c.set('tenantId', payload.tenantId)
        c.set('userId', payload.sub)
        c.set('userRole', payload.role)

        await next()
    } catch (e) {
        return c.json({ success: false, error: '유효하지 않은 토큰입니다.' }, 401)
    }
}
