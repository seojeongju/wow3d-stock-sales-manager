import { Hono } from 'hono'
import type { Bindings, Variables, Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '../types.ts'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 창고 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    const { results } = await DB.prepare(`
    SELECT * FROM warehouses 
    WHERE tenant_id = ? AND is_active = 1 
    ORDER BY created_at ASC
  `).bind(tenantId).all<Warehouse>()

    return c.json({ success: true, data: results })
})

// 창고 등록
app.post('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const body = await c.req.json<CreateWarehouseRequest>()

    if (!body.name) {
        return c.json({ success: false, error: '창고명은 필수입니다.' }, 400)
    }

    const result = await DB.prepare(`
    INSERT INTO warehouses (tenant_id, name, location, description)
    VALUES (?, ?, ?, ?)
  `).bind(tenantId, body.name, body.location || null, body.description || null).run()

    return c.json({
        success: true,
        message: '창고가 등록되었습니다.',
        data: { id: result.meta.last_row_id }
    })
})

// 창고 수정
app.put('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json<UpdateWarehouseRequest>()

    const warehouse = await DB.prepare('SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first()
    if (!warehouse) {
        return c.json({ success: false, error: '창고를 찾을 수 없습니다.' }, 404)
    }

    const updates: string[] = []
    const params: any[] = []

    if (body.name !== undefined) {
        updates.push('name = ?')
        params.push(body.name)
    }
    if (body.location !== undefined) {
        updates.push('location = ?')
        params.push(body.location)
    }
    if (body.description !== undefined) {
        updates.push('description = ?')
        params.push(body.description)
    }
    if (body.is_active !== undefined) {
        updates.push('is_active = ?')
        params.push(body.is_active)
    }

    if (updates.length === 0) {
        return c.json({ success: false, error: '수정할 내용이 없습니다.' }, 400)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id, tenantId)

    await DB.prepare(`
    UPDATE warehouses SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
  `).bind(...params).run()

    return c.json({ success: true, message: '창고 정보가 수정되었습니다.' })
})

// 창고 삭제 (비활성화)
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    // 재고가 남아있는지 확인
    const stock = await DB.prepare(`
    SELECT SUM(quantity) as total FROM product_warehouse_stocks 
    WHERE warehouse_id = ? AND quantity > 0
  `).bind(id).first<{ total: number }>()

    if (stock && stock.total > 0) {
        return c.json({ success: false, error: '재고가 남아있는 창고는 삭제할 수 없습니다.' }, 400)
    }

    await DB.prepare('UPDATE warehouses SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .run()

    return c.json({ success: true, message: '창고가 삭제되었습니다.' })
})

export default app
