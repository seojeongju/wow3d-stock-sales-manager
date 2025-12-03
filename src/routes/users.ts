import { Hono } from 'hono'
import type { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// 현재 사용자 정보 조회 (임시로 첫 번째 사용자 반환)
app.get('/me', async (c) => {
    const { DB } = c.env

    // 실제 인증 시스템이 있다면 세션/토큰에서 ID를 가져와야 함
    const user = await DB.prepare('SELECT * FROM users LIMIT 1').first()

    if (!user) {
        // 사용자가 없으면 기본값 반환
        return c.json({
            success: true,
            data: {
                name: 'Guest',
                email: 'guest@example.com',
                role: 'guest',
                avatar_url: null
            }
        })
    }

    return c.json({ success: true, data: user })
})

export default app
