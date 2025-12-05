import { Hono } from 'hono'
import type { Bindings, Variables, StockMovementRequest, StockTransferRequest } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 재고 이동 내역 조회
app.get('/movements', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const productId = c.req.query('productId') || ''
  const movementType = c.req.query('movementType') || ''
  const startDate = c.req.query('startDate') || ''
  const endDate = c.req.query('endDate') || ''
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = (page - 1) * limit

  const warehouseId = c.req.query('warehouseId')

  let query = `
    SELECT sm.*, p.name as product_name, p.sku, p.category, p.category_medium, p.category_small,
           w.name as warehouse_name, w2.name as to_warehouse_name, u.name as created_by_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN warehouses w ON sm.warehouse_id = w.id
    LEFT JOIN warehouses w2 ON sm.to_warehouse_id = w2.id
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE sm.tenant_id = ?
  `
  const params: any[] = [tenantId]

  if (productId) {
    query += ' AND sm.product_id = ?'
    params.push(productId)
  }

  if (warehouseId) {
    query += ' AND (sm.warehouse_id = ? OR sm.to_warehouse_id = ?)'
    params.push(warehouseId, warehouseId)
  }

  if (movementType) {
    query += ' AND sm.movement_type = ?'
    params.push(movementType)
  }

  if (startDate) {
    query += ' AND DATE(sm.created_at) >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND DATE(sm.created_at) <= ?'
    params.push(endDate)
  }

  // Count query
  let countQuery = `
    SELECT COUNT(*) as total
    FROM stock_movements sm
    WHERE sm.tenant_id = ?
  `
  const countParams: any[] = [tenantId]

  if (productId) {
    countQuery += ' AND sm.product_id = ?'
    countParams.push(productId)
  }

  if (warehouseId) {
    countQuery += ' AND (sm.warehouse_id = ? OR sm.to_warehouse_id = ?)'
    countParams.push(warehouseId, warehouseId)
  }

  if (movementType) {
    countQuery += ' AND sm.movement_type = ?'
    countParams.push(movementType)
  }

  if (startDate) {
    countQuery += ' AND DATE(sm.created_at) >= ?'
    countParams.push(startDate)
  }

  if (endDate) {
    countQuery += ' AND DATE(sm.created_at) <= ?'
    countParams.push(endDate)
  }

  query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const { results } = await DB.prepare(query).bind(...params).all()
  const totalResult = await DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()
  const total = totalResult?.total || 0

  return c.json({
    success: true,
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})

// 특정 상품의 재고 이동 내역
app.get('/movements/:productId', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const productId = c.req.param('productId')

  const { results } = await DB.prepare(`
    SELECT * FROM stock_movements
    WHERE product_id = ? AND tenant_id = ?
    ORDER BY created_at DESC
  `).bind(productId, tenantId).all()

  return c.json({ success: true, data: results })
})

// 재고 입고
app.post('/in', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<StockMovementRequest>()

  if (body.quantity <= 0) {
    return c.json({ success: false, error: '입고 수량은 0보다 커야 합니다.' }, 400)
  }

  const warehouseId = (body as any).warehouse_id
  if (!warehouseId) {
    return c.json({ success: false, error: '입고 창고를 선택해주세요.' }, 400)
  }

  // 상품 확인
  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1 AND tenant_id = ?')
    .bind(body.product_id, tenantId)
    .first()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  // 1. 총 재고 증가
  await DB.prepare(`
    UPDATE products 
    SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(body.quantity, body.product_id, tenantId).run()

  // 2. 창고 재고 증가 (UPSERT)
  await DB.prepare(`
    INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(product_id, warehouse_id) 
    DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
  `).bind(tenantId, body.product_id, warehouseId, body.quantity, body.quantity).run()

  // 3. 재고 이동 기록
  await DB.prepare(`
    INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
    VALUES (?, ?, ?, '입고', ?, ?, ?, ?)
  `).bind(
    tenantId,
    body.product_id,
    warehouseId,
    body.quantity,
    body.reason || '입고',
    body.notes || null,
    c.get('userId')
  ).run()

  return c.json({ success: true, message: '입고 처리되었습니다.' })
})

// 재고 출고
app.post('/out', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<StockMovementRequest>()

  if (body.quantity <= 0) {
    return c.json({ success: false, error: '출고 수량은 0보다 커야 합니다.' }, 400)
  }

  const warehouseId = (body as any).warehouse_id
  if (!warehouseId) {
    return c.json({ success: false, error: '출고 창고를 선택해주세요.' }, 400)
  }

  // 상품 확인
  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1 AND tenant_id = ?')
    .bind(body.product_id, tenantId)
    .first<any>()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  // 창고 재고 확인
  const warehouseStock = await DB.prepare(`
    SELECT quantity FROM product_warehouse_stocks 
    WHERE product_id = ? AND warehouse_id = ?
  `).bind(body.product_id, warehouseId).first<{ quantity: number }>()

  const currentWarehouseStock = warehouseStock?.quantity || 0

  if (currentWarehouseStock < body.quantity) {
    return c.json({
      success: false,
      error: `해당 창고의 재고가 부족합니다. (현재: ${currentWarehouseStock})`
    }, 400)
  }

  // 1. 총 재고 감소
  await DB.prepare(`
    UPDATE products 
    SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(body.quantity, body.product_id, tenantId).run()

  // 2. 창고 재고 감소
  await DB.prepare(`
    UPDATE product_warehouse_stocks
    SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ? AND warehouse_id = ?
  `).bind(body.quantity, body.product_id, warehouseId).run()

  // 3. 재고 이동 기록
  await DB.prepare(`
    INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
    VALUES (?, ?, ?, '출고', ?, ?, ?, ?)
  `).bind(
    tenantId,
    body.product_id,
    warehouseId,
    -body.quantity,
    body.reason || '출고',
    body.notes || null,
    c.get('userId')
  ).run()

  return c.json({ success: true, message: '출고 처리되었습니다.' })
})

// 재고 조정
app.post('/adjust', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<StockMovementRequest & { new_stock: number }>()

  // 상품 확인
  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1 AND tenant_id = ?')
    .bind(body.product_id, tenantId)
    .first<any>()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  const currentStock = product.current_stock
  const newStock = body.new_stock
  const difference = newStock - currentStock

  if (difference === 0) {
    return c.json({ success: false, error: '재고 변동이 없습니다.' }, 400)
  }

  // 재고 조정
  await DB.prepare(`
    UPDATE products 
    SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(newStock, body.product_id, tenantId).run()

  // 재고 이동 기록
  await DB.prepare(`
    INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity, reason, notes, created_by)
    VALUES (?, ?, '조정', ?, ?, ?, ?)
  `).bind(
    tenantId,
    body.product_id,
    difference,
    body.reason || '재고 조정',
    body.notes || `이전 재고: ${currentStock}, 조정 후: ${newStock}`,
    c.get('userId')
  ).run()

  return c.json({
    success: true,
    message: '재고가 조정되었습니다.',
    data: { old_stock: currentStock, new_stock: newStock, difference }
  })
})

// 재고 현황 요약
app.get('/summary', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const summary = await DB.prepare(`
    SELECT 
      COUNT(*) as total_products,
      SUM(current_stock) as total_stock,
      SUM(current_stock * purchase_price) as total_stock_value,
      COUNT(CASE WHEN current_stock <= min_stock_alert THEN 1 END) as low_stock_count
    FROM products
    WHERE is_active = 1 AND tenant_id = ?
  `).bind(tenantId).first()

  return c.json({ success: true, data: summary })
})

// 창고 간 재고 이동
app.post('/transfer', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<StockTransferRequest>()

  if (body.quantity <= 0) {
    return c.json({ success: false, error: '이동 수량은 0보다 커야 합니다.' }, 400)
  }
  if (body.from_warehouse_id === body.to_warehouse_id) {
    return c.json({ success: false, error: '출발 창고와 도착 창고가 같을 수 없습니다.' }, 400)
  }

  // 출발 창고 재고 확인
  const fromStock = await DB.prepare(`
    SELECT quantity FROM product_warehouse_stocks 
    WHERE product_id = ? AND warehouse_id = ?
  `).bind(body.product_id, body.from_warehouse_id).first<{ quantity: number }>()

  const currentFromStock = fromStock?.quantity || 0

  if (currentFromStock < body.quantity) {
    return c.json({ success: false, error: `출발 창고의 재고가 부족합니다. (현재: ${currentFromStock})` }, 400)
  }

  // 1. 출발 창고 재고 감소
  await DB.prepare(`
    UPDATE product_warehouse_stocks
    SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ? AND warehouse_id = ?
  `).bind(body.quantity, body.product_id, body.from_warehouse_id).run()

  // 2. 도착 창고 재고 증가 (UPSERT)
  await DB.prepare(`
    INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(product_id, warehouse_id) 
    DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
  `).bind(tenantId, body.product_id, body.to_warehouse_id, body.quantity, body.quantity).run()

  // 3. 이동 기록
  await DB.prepare(`
    INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, to_warehouse_id, movement_type, quantity, reason, notes, created_by)
    VALUES (?, ?, ?, ?, '이동', ?, ?, ?, ?)
  `).bind(
    tenantId,
    body.product_id,
    body.from_warehouse_id,
    body.to_warehouse_id,
    body.quantity,
    body.reason || '창고 이동',
    `From ${body.from_warehouse_id} to ${body.to_warehouse_id}`,
    c.get('userId')
  ).run()

  return c.json({ success: true, message: '재고 이동이 완료되었습니다.' })
})

// 특정 상품의 창고별 재고 조회
app.get('/warehouse-stocks/:productId', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const productId = c.req.param('productId')

  const { results } = await DB.prepare(`
    SELECT pws.*, w.name as warehouse_name
    FROM product_warehouse_stocks pws
    JOIN warehouses w ON pws.warehouse_id = w.id
    WHERE pws.product_id = ? AND pws.tenant_id = ?
  `).bind(productId, tenantId).all()

  return c.json({ success: true, data: results })
})

// 초기 재고 데이터 마이그레이션 (기존 재고를 기본 창고로 할당)
app.post('/migration/legacy-stock', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')

  // 1. 기본 창고 확인 또는 생성
  let defaultWarehouse = await DB.prepare('SELECT * FROM warehouses WHERE tenant_id = ? AND name = ?')
    .bind(tenantId, '기본 창고')
    .first<any>()

  if (!defaultWarehouse) {
    const res = await DB.prepare('INSERT INTO warehouses (tenant_id, name, location, description) VALUES (?, ?, ?, ?) RETURNING id')
      .bind(tenantId, '기본 창고', '본사', '초기 재고 할당용 기본 창고')
      .first<any>()

    defaultWarehouse = { id: res.id }
  }

  const warehouseId = defaultWarehouse.id

  // 2. 모든 상품 조회
  const { results: products } = await DB.prepare('SELECT * FROM products WHERE tenant_id = ?').bind(tenantId).all<any>()

  let updatedCount = 0

  for (const product of products) {
    // 3. 해당 상품의 창고 재고 합계 조회
    const stockSum = await DB.prepare('SELECT SUM(quantity) as total FROM product_warehouse_stocks WHERE product_id = ? AND tenant_id = ?')
      .bind(product.id, tenantId)
      .first<any>()

    const warehouseTotal = stockSum?.total || 0
    const diff = product.current_stock - warehouseTotal

    // 4. 차이가 양수면(총 재고가 더 많으면) 차이만큼 기본 창고에 추가
    if (diff > 0) {
      // 창고 재고 추가 (UPSERT)
      await DB.prepare(`
        INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(product_id, warehouse_id) 
        DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
      `).bind(tenantId, product.id, warehouseId, diff, diff).run()

      // 이동 내역 기록
      await DB.prepare(`
        INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
        VALUES (?, ?, ?, '조정', ?, '초기 재고 마이그레이션', '기존 재고 데이터 동기화', ?)
      `).bind(tenantId, product.id, warehouseId, diff, userId).run()

      updatedCount++
    }
  }

  return c.json({ success: true, message: `재고 동기화 완료 (${updatedCount}개 상품 처리됨)`, data: { updatedCount } })
})

// 재고 이동 내역 삭제 (역보정)
app.delete('/movements/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  // 1. 내역 조회
  const movement = await DB.prepare('SELECT * FROM stock_movements WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<any>()

  if (!movement) {
    return c.json({ success: false, error: '내역을 찾을 수 없습니다.' }, 404)
  }

  // 2. 역보정 (Reverse Operation)
  try {
    if (movement.movement_type === '입고') {
      // 입고 취소 -> 재고 감소
      // 총 재고 감소
      await DB.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).bind(movement.quantity, movement.product_id).run()
      // 창고 재고 감소
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()

    } else if (movement.movement_type === '출고') {
      // 출고 취소 -> 재고 증가 (출고는 quantity가 음수로 저장되어 있을 수 있음 -> 확인 필요. 위 코드에서 -body.quantity로 저장함. 즉 음수임.)
      // 하지만 DB에 저장될 때 quantity 컬럼이 음수인지 양수인지 확인해야 함.
      // 위 코드: VALUES (?, ?, ?, '출고', ?, ...) .bind(..., -body.quantity, ...) -> 음수로 저장됨.
      // 따라서 취소하려면 빼주면 됨 (음수를 빼면 더해짐).
      // 총 재고 감소 (음수를 빼므로 증가)
      await DB.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).bind(movement.quantity, movement.product_id).run()
      // 창고 재고 감소
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()

    } else if (movement.movement_type === '이동') {
      // 이동 취소 -> 출발지 증가, 도착지 감소
      // 이동은 quantity가 양수로 저장됨 (위 코드 확인: body.quantity).
      // 출발지(warehouse_id) 재고 증가
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()
      // 도착지(to_warehouse_id) 재고 감소
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.to_warehouse_id).run()

    } else if (movement.movement_type === '조정') {
      // 조정 취소 -> 변동량만큼 역보정
      // 조정은 quantity가 변동량(difference)임.
      // 총 재고 역보정
      await DB.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).bind(movement.quantity, movement.product_id).run()
      // 창고 재고 역보정 (조정 시 warehouse_id가 있으면)
      if (movement.warehouse_id) {
        await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()
      }
    }

    // 3. 내역 삭제
    await DB.prepare('DELETE FROM stock_movements WHERE id = ?').bind(id).run()

    return c.json({ success: true, message: '내역이 삭제되고 재고가 원상복구되었습니다.' })

  } catch (e) {
    console.error(e)
    return c.json({ success: false, error: '삭제 처리 중 오류가 발생했습니다.' }, 500)
  }
})


// 재고 이동 내역 삭제 (역보정)
app.delete('/movements/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  // 1. 내역 조회
  const movement = await DB.prepare('SELECT * FROM stock_movements WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<any>()

  if (!movement) {
    return c.json({ success: false, error: '내역을 찾을 수 없습니다.' }, 404)
  }

  // 2. 역보정 (Reverse Operation)
  try {
    if (movement.movement_type === '입고') {
      // 입고 취소 -> 재고 감소
      // 감소 후 재고가 음수가 되는지 확인
      const currentStock = await DB.prepare('SELECT quantity FROM product_warehouse_stocks WHERE product_id = ? AND warehouse_id = ?')
        .bind(movement.product_id, movement.warehouse_id)
        .first<{ quantity: number }>()

      if (!currentStock || currentStock.quantity < movement.quantity) {
        return c.json({ success: false, error: `재고가 부족하여 입고 내역을 취소할 수 없습니다. (현재: ${currentStock?.quantity || 0}, 취소 필요: ${movement.quantity})` }, 400)
      }

      // 총 재고 감소
      await DB.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).bind(movement.quantity, movement.product_id).run()
      // 창고 재고 감소
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()

    } else if (movement.movement_type === '출고') {
      // 출고 취소 -> 재고 증가 (출고는 quantity가 음수로 저장되어 있을 수 있음 -> 확인 필요. 위 코드에서 -body.quantity로 저장함. 즉 음수임.)
      // 하지만 DB에 저장될 때 quantity 컬럼이 음수인지 양수인지 확인해야 함.
      // 위 코드: VALUES (?, ?, ?, '출고', ?, ...) .bind(..., -body.quantity, ...) -> 음수로 저장됨.
      // 따라서 취소하려면 빼주면 됨 (음수를 빼면 더해짐).
      // 총 재고 감소 (음수를 빼므로 증가)
      await DB.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).bind(movement.quantity, movement.product_id).run()
      // 창고 재고 감소
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()

    } else if (movement.movement_type === '이동') {
      // 이동 취소 -> 출발지 증가, 도착지 감소
      // 이동은 quantity가 양수로 저장됨 (위 코드 확인: body.quantity).

      // 도착지 재고 확인 (감소시켜야 하므로)
      const toStock = await DB.prepare('SELECT quantity FROM product_warehouse_stocks WHERE product_id = ? AND warehouse_id = ?')
        .bind(movement.product_id, movement.to_warehouse_id)
        .first<{ quantity: number }>()

      if (!toStock || toStock.quantity < movement.quantity) {
        return c.json({ success: false, error: `도착지 창고의 재고가 부족하여 이동 내역을 취소할 수 없습니다. (현재: ${toStock?.quantity || 0}, 취소 필요: ${movement.quantity})` }, 400)
      }

      // 출발지(warehouse_id) 재고 증가
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()
      // 도착지(to_warehouse_id) 재고 감소
      await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.to_warehouse_id).run()

    } else if (movement.movement_type === '조정') {
      // 조정 취소 -> 변동량만큼 역보정
      // 조정은 quantity가 변동량(difference)임.
      // 만약 quantity가 양수였다면(재고 증가), 취소 시 감소시켜야 함 -> 재고 부족 확인 필요
      if (movement.quantity > 0) {
        // 총 재고 확인
        const prod = await DB.prepare('SELECT current_stock FROM products WHERE id = ?').bind(movement.product_id).first<{ current_stock: number }>()
        if (!prod || prod.current_stock < movement.quantity) {
          return c.json({ success: false, error: `총 재고가 부족하여 조정 내역을 취소할 수 없습니다.` }, 400)
        }

        // 창고 재고 확인 (조정 시 warehouse_id가 있었다면)
        if (movement.warehouse_id) {
          const whStock = await DB.prepare('SELECT quantity FROM product_warehouse_stocks WHERE product_id = ? AND warehouse_id = ?')
            .bind(movement.product_id, movement.warehouse_id)
            .first<{ quantity: number }>()
          if (!whStock || whStock.quantity < movement.quantity) {
            return c.json({ success: false, error: `창고 재고가 부족하여 조정 내역을 취소할 수 없습니다.` }, 400)
          }
        }
      }

      // 총 재고 역보정
      await DB.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).bind(movement.quantity, movement.product_id).run()
      // 창고 재고 역보정 (조정 시 warehouse_id가 있으면)
      if (movement.warehouse_id) {
        await DB.prepare(`UPDATE product_warehouse_stocks SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`).bind(movement.quantity, movement.product_id, movement.warehouse_id).run()
      }
    }

    // 3. 내역 삭제
    await DB.prepare('DELETE FROM stock_movements WHERE id = ?').bind(id).run()

    // 4. 재고 0 이하인 창고 데이터 정리 (사용자 요청: 삭제된 내역이 리스트에서도 사라지도록)
    // 주의: 여기서 0 이하를 삭제하면, 방금 마이너스가 된 데이터도 사라져버림. 
    // 하지만 위에서 마이너스가 되지 않도록 막았으므로, 여기서는 '0'이 된 데이터를 정리하는 용도.
    // 혹시라도 마이너스 데이터가 있다면 삭제해버리는게 나을수도 있음 (사용자가 원한게 그거라면).
    // 하지만 "마이너스 값이 나오면 안될것 같은데?"라는 말은 마이너스 상태를 '방지'하고 싶다는 뜻.
    // 이미 마이너스인 데이터는? 사용자가 '삭제' 버튼으로 지울 수 있게 해줬음.
    // 여기서는 0 이하인 데이터를 자동 삭제하는 로직을 유지하되, 마이너스 방지 로직이 우선함.
    await DB.prepare('DELETE FROM product_warehouse_stocks WHERE quantity <= 0 AND tenant_id = ?').bind(tenantId).run()

    return c.json({ success: true, message: '내역이 삭제되고 재고가 원상복구되었습니다.' })

  } catch (e) {
    console.error(e)
    return c.json({ success: false, error: '삭제 처리 중 오류가 발생했습니다.' }, 500)
  }
})


// 창고별 재고 목록 조회 (전체 또는 특정 창고) - 페이지네이션 및 최신순 정렬
app.get('/warehouse-stocks', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const warehouseId = c.req.query('warehouseId')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = (page - 1) * limit

  let query = `
    SELECT pws.*, p.name as product_name, p.sku, p.category, w.name as warehouse_name
    FROM product_warehouse_stocks pws
    JOIN products p ON pws.product_id = p.id
    JOIN warehouses w ON pws.warehouse_id = w.id
    WHERE pws.tenant_id = ?
  `
  const params: any[] = [tenantId]

  if (warehouseId) {
    query += ' AND pws.warehouse_id = ?'
    params.push(warehouseId)
  }

  // 최신순 정렬 (updated_at 기준 내림차순)
  query += ' ORDER BY pws.updated_at DESC, p.name ASC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const { results } = await DB.prepare(query).bind(...params).all()

  // 전체 개수 조회 (페이지네이션용)
  let countQuery = `
    SELECT COUNT(*) as total
    FROM product_warehouse_stocks pws
    WHERE pws.tenant_id = ?
  `
  const countParams: any[] = [tenantId]

  if (warehouseId) {
    countQuery += ' AND pws.warehouse_id = ?'
    countParams.push(warehouseId)
  }

  const totalResult = await DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()
  const total = totalResult?.total || 0

  return c.json({
    success: true,
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})

// 창고 재고 항목 삭제
app.delete('/warehouse-stocks/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const userId = c.get('userId')

  // 1. 재고 정보 조회
  const stock = await DB.prepare('SELECT * FROM product_warehouse_stocks WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<any>()

  if (!stock) {
    return c.json({ success: false, error: '재고 정보를 찾을 수 없습니다.' }, 404)
  }

  // 2. 수량이 0이 아니면 총 재고 조정 및 기록
  if (stock.quantity !== 0) {
    // 총 재고 차감
    await DB.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?')
      .bind(stock.quantity, stock.product_id)
      .run()

    // 이동 내역 기록 (삭제)
    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
      VALUES (?, ?, ?, '조정', ?, '재고 목록에서 삭제', '사용자 요청에 의한 데이터 삭제', ?)
    `).bind(tenantId, stock.product_id, stock.warehouse_id, -stock.quantity, userId).run()
  }

  // 3. 항목 삭제
  await DB.prepare('DELETE FROM product_warehouse_stocks WHERE id = ?').bind(id).run()

  return c.json({ success: true, message: '재고 항목이 삭제되었습니다.' })
})

export default app
