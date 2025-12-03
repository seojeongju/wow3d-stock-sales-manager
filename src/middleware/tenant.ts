import { Context, Next } from 'hono'

export const tenantMiddleware = async (c: Context, next: Next) => {
    // 1. 헤더에서 Tenant ID 확인 (개발/테스트용)
    // 실제 운영 환경에서는 JWT 토큰에서 추출해야 함
    const tenantIdHeader = c.req.header('X-Tenant-ID')

    let tenantId = 1; // 기본값: Default Organization

    if (tenantIdHeader) {
        const parsed = parseInt(tenantIdHeader);
        if (!isNaN(parsed)) {
            tenantId = parsed;
        }
    }

    // 2. 컨텍스트에 저장
    c.set('tenantId', tenantId);

    await next();
}
