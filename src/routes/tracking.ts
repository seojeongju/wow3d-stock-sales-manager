import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 택배사 코드 매핑
const COURIER_CODES: Record<string, string> = {
    'CJ대한통운': '04',
    'CJ': '04',
    '로젠택배': '06',
    '로젠': '06',
    '우체국택배': '01',
    '우체국': '01',
    '한진택배': '05',
    '한진': '05',
    '롯데택배': '08',
    '롯데': '08',
}

// 택배사 코드 조회
function getCourierCode(courierName: string): string | null {
    const normalized = courierName.replace(/\s+/g, '')
    return COURIER_CODES[normalized] || COURIER_CODES[courierName] || null
}

// 배송 조회
app.get('/track/:trackingNumber', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { trackingNumber } = c.req.param()
    const courier = c.req.query('courier') || ''

    try {
        // API 키 조회
        const settingRow = await DB.prepare(`
            SELECT setting_value FROM settings 
            WHERE tenant_id = ? AND setting_key = 'sweettracker_api_key'
        `).bind(tenantId).first<{ setting_value: string }>()

        if (!settingRow || !settingRow.setting_value) {
            return c.json({
                success: false,
                error: 'API 키가 설정되지 않았습니다. 관리자 페이지에서 설정해주세요.'
            }, 400)
        }

        const apiKey = settingRow.setting_value
        const courierCode = getCourierCode(courier)

        if (!courierCode) {
            return c.json({
                success: false,
                error: `지원하지 않는 택배사입니다: ${courier}`
            }, 400)
        }

        // 운송장 번호 정규화 (하이픈, 공백 제거)
        const normalizedTrackingNumber = trackingNumber.replace(/[-\s]/g, '')

        // 스위트트래커 API 호출
        const apiUrl = `http://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${apiKey}&t_code=${courierCode}&t_invoice=${normalizedTrackingNumber}`

        const response = await fetch(apiUrl)
        const data: any = await response.json()

        if (!data.status) {
            return c.json({
                success: false,
                error: data.msg || '배송 조회 실패',
                data
            }, 400)
        }

        return c.json({
            success: true,
            data: {
                trackingNumber,
                courier,
                courierCode,
                complete: data.complete,
                level: data.level,
                senderName: data.senderName,
                receiverName: data.receiverName,
                receiverAddr: data.receiverAddr,
                itemName: data.itemName,
                trackingDetails: data.trackingDetails || []
            }
        })

    } catch (error: any) {
        console.error('Tracking error:', error)
        return c.json({
            success: false,
            error: '배송 조회 중 오류가 발생했습니다.',
            details: error.message
        }, 500)
    }
})

// 여러 운송장 조회 (일괄 조회)
app.post('/track/bulk', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const body = await c.req.json<{ items: Array<{ trackingNumber: string; courier: string }> }>()

    try {
        // API 키 조회
        const settingRow = await DB.prepare(`
            SELECT setting_value FROM settings 
            WHERE tenant_id = ? AND setting_key = 'sweettracker_api_key'
        `).bind(tenantId).first<{ setting_value: string }>()

        if (!settingRow || !settingRow.setting_value) {
            return c.json({
                success: false,
                error: 'API 키가 설정되지 않았습니다.'
            }, 400)
        }

        const apiKey = settingRow.setting_value
        const results = []

        // 순차 조회 (동시 조회는 API 제한 걸릴 수 있음)
        for (const item of body.items) {
            const courierCode = getCourierCode(item.courier)
            if (!courierCode) {
                results.push({
                    trackingNumber: item.trackingNumber,
                    success: false,
                    error: '지원하지 않는 택배사'
                })
                continue
            }

            // 운송장 번호 정규화
            const normalizedTrackingNumber = item.trackingNumber.replace(/[-\s]/g, '')

            const apiUrl = `http://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${apiKey}&t_code=${courierCode}&t_invoice=${normalizedTrackingNumber}`

            try {
                const response = await fetch(apiUrl)
                const data: any = await response.json()

                results.push({
                    trackingNumber: item.trackingNumber,
                    courier: item.courier,
                    success: data.status,
                    complete: data.complete,
                    level: data.level,
                    data
                })
            } catch (err) {
                results.push({
                    trackingNumber: item.trackingNumber,
                    success: false,
                    error: '조회 실패'
                })
            }

            // API 레이트 리미트 방지 (100ms 대기)
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        return c.json({ success: true, data: results })

    } catch (error: any) {
        console.error('Bulk tracking error:', error)
        return c.json({
            success: false,
            error: '일괄 조회 중 오류가 발생했습니다.'
        }, 500)
    }
})

export default app
