import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

export const tenantMiddleware = async (c: Context, next: Next) => {
    // 인증이 필요 없는 경로 제외
    // 인증이 필요 없는 경로 제외
    const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/find-email', '/api/auth/reset-password'];
    // /api/auth/me는 인증이 필요하므로 제외 목록에 포함하지 않음
    if (publicPaths.some(path => c.req.path === path || c.req.path.startsWith(path + '/'))) {
        await next()
        return
    }

    console.log('[TENANT MIDDLEWARE] Path:', c.req.path)

    const authHeader = c.req.header('Authorization')
    console.log('[TENANT MIDDLEWARE] Auth header:', authHeader)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[TENANT MIDDLEWARE] No auth header or invalid format')
        return c.json({ success: false, error: '인증이 필요합니다.' }, 401)
    }

    const token = authHeader.split(' ')[1]
    const secret = c.env.JWT_SECRET || 'dev-secret-key-1234'

    try {
        const payload = await verify(token, secret) as any
        console.log('[TENANT MIDDLEWARE] Token verified. Payload:', payload)

        // Access Token인지 확인
        if (payload.type !== 'access') {
            return c.json({ success: false, error: '유효하지 않은 토큰 타입입니다.' }, 401)
        }

        // 컨텍스트에 저장
        let tenantId = payload.tenantId

        // 슈퍼관리자 Impersonation (조직 접속) 기능
        if (payload.role === 'SUPER_ADMIN') {
            const targetTenantId = c.req.header('X-Tenant-ID')
            if (targetTenantId) {
                console.log(`[SUPER ADMIN] Switches context to Tenant #${targetTenantId}`)
                tenantId = parseInt(targetTenantId)
            }
        }

        c.set('tenantId', tenantId)
        c.set('userId', payload.sub)
        c.set('userRole', payload.role)

        await next()
    } catch (e) {
        console.log('[TENANT MIDDLEWARE] Token verification failed:', e)
        return c.json({ success: false, error: '유효하지 않은 토큰입니다.' }, 401)
    }
}
