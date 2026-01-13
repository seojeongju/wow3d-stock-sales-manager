import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 옵션 그룹 및 값 목록 조회
app.get('/groups', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    const { results: groups } = await DB.prepare('SELECT * FROM product_option_groups WHERE tenant_id = ? ORDER BY name')
        .bind(tenantId)
        .all()

    const { results: values } = await DB.prepare('SELECT * FROM product_option_values WHERE tenant_id = ?')
        .bind(tenantId)
        .all()

    // 그룹별로 값 매핑
    const data = groups.map((g: any) => ({
        ...g,
        values: values.filter((v: any) => v.group_id === g.id)
    }))

    return c.json({ success: true, data })
})

// 옵션 그룹 생성
app.post('/groups', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const { name, values } = await c.req.json<{ name: string; values: { value: string; additional_price?: number }[] }>()

    try {
        const result = await DB.prepare('INSERT INTO product_option_groups (tenant_id, name) VALUES (?, ?) RETURNING id')
            .bind(tenantId, name)
            .first<{ id: number }>()

        const groupId = result!.id

        if (values && values.length > 0) {
            const stmt = DB.prepare('INSERT INTO product_option_values (tenant_id, group_id, value, additional_price) VALUES (?, ?, ?, ?)')
            const batch = values.map(v => stmt.bind(tenantId, groupId, v.value, v.additional_price || 0))
            await DB.batch(batch)
        }

        return c.json({ success: true, data: { id: groupId }, message: '옵션 그룹이 생성되었습니다.' })
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500)
    }
})

// 옵션 그룹 수정
app.put('/groups/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = parseInt(c.req.param('id'))
    const { name, values } = await c.req.json<{ name: string; values: { id?: number; value: string; additional_price?: number }[] }>()

    if (isNaN(id)) return c.json({ success: false, error: '유효하지 않은 ID입니다.' }, 400)

    try {
        const batch: any[] = []

        // 1. 그룹 이름 업데이트
        batch.push(DB.prepare('UPDATE product_option_groups SET name = ? WHERE id = ? AND tenant_id = ?')
            .bind(name, id, tenantId))

        // 2. 기존 값들 조회
        const { results: existingValues } = await DB.prepare('SELECT id FROM product_option_values WHERE group_id = ? AND tenant_id = ?')
            .bind(id, tenantId)
            .all<{ id: number }>()

        const existingIds = existingValues.map((v: { id: number }) => v.id)
        const submittedIds = values.filter(v => v.id).map(v => v.id!)

        // 3. 삭제 처리 (제출된 목록에 없는 ID들)
        const idsToDelete = existingIds.filter((eid: number) => !submittedIds.includes(eid))
        if (idsToDelete.length > 0) {
            // 사용 중인 값인지 확인
            const placeholders = idsToDelete.map(() => '?').join(',')
            const { results: inUse } = await DB.prepare(`SELECT DISTINCT option_value_id FROM product_variant_options WHERE option_value_id IN (${placeholders}) AND tenant_id = ?`)
                .bind(...idsToDelete, tenantId)
                .all<{ option_value_id: number }>()

            const inUseIds = inUse.map((row: { option_value_id: number }) => row.option_value_id)
            const safeToDeleteIds = idsToDelete.filter((targetId: number) => !inUseIds.includes(targetId))

            if (safeToDeleteIds.length > 0) {
                const deletePlaceholders = safeToDeleteIds.map(() => '?').join(',')
                batch.push(DB.prepare(`DELETE FROM product_option_values WHERE id IN (${deletePlaceholders}) AND tenant_id = ?`)
                    .bind(...safeToDeleteIds, tenantId))
            }

            if (inUseIds.length > 0) {
                // 사용 중인 항목이 삭제 대상에 포함된 경우 경고 (일단 삭제하지 않고 유지)
                // 실제로는 에러를 던지거나 하는 게 좋지만, 여기서는 배치를 계속 진행하도록 함.
            }
        }

        // 4. 업데이트 및 삽입
        const updateStmt = DB.prepare('UPDATE product_option_values SET value = ?, additional_price = ? WHERE id = ? AND tenant_id = ?')
        const insertStmt = DB.prepare('INSERT INTO product_option_values (tenant_id, group_id, value, additional_price) VALUES (?, ?, ?, ?)')

        values.forEach((v: { id?: number; value: string; additional_price?: number }) => {
            if (v.id) {
                batch.push(updateStmt.bind(v.value, v.additional_price || 0, v.id, tenantId))
            } else {
                batch.push(insertStmt.bind(tenantId, id, v.value, v.additional_price || 0))
            }
        })

        await DB.batch(batch)

        return c.json({ success: true, message: '옵션 그룹이 수정되었습니다.' })
    } catch (error: any) {
        console.error('[PUT /groups/:id] Error:', error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// 옵션 그룹 삭제
app.delete('/groups/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) return c.json({ success: false, error: '유효하지 않은 ID입니다.' }, 400)

    try {
        // 트랜잭션 수동 구현 (D1은 batch 권장)
        await DB.batch([
            DB.prepare('DELETE FROM product_option_values WHERE group_id = ? AND tenant_id = ?').bind(id, tenantId),
            DB.prepare('DELETE FROM product_option_groups WHERE id = ? AND tenant_id = ?').bind(id, tenantId)
        ]);

        return c.json({ success: true, message: '옵션 그룹이 삭제되었습니다.' })
    } catch (error: any) {
        console.error('[DELETE /groups/:id] Error:', error)
        let errorMsg = error.message
        if (errorMsg.includes('FOREIGN KEY constraint failed')) {
            errorMsg = '이 옵션 그룹을 사용 중인 상품이 있어 삭제할 수 없습니다.'
        }
        return c.json({ success: false, error: errorMsg }, 500)
    }
})

export default app
