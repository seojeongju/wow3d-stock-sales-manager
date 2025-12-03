import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { checkPlanLimit } from '../utils/subscription'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CSV 생성 유틸리티
function convertToCSV(objArray: any[]) {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';

    // 헤더 생성 (한글 컬럼명 매핑)
    const headerMap: { [key: string]: string } = {
        sku: 'SKU',
        name: '상품명',
        category: '카테고리',
        purchase_price: '매입가',
        selling_price: '판매가',
        current_stock: '현재재고',
        min_stock_alert: '최소재고알림',
        supplier: '공급사',
        brand: '브랜드',
        status: '상태'
    };

    const headers = Object.keys(headerMap);
    str += headers.map(h => headerMap[h]).join(',') + '\r\n';

    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (let index in headers) {
            if (line != '') line += ','
            const key = headers[index];
            let value = array[i][key];

            // CSV 이스케이프 처리 (따옴표, 콤마 등)
            if (value === null || value === undefined) value = '';
            value = String(value).replace(/"/g, '""');
            if (value.search(/("|,|\n)/g) >= 0) value = `"${value}"`;

            line += value;
        }
        str += line + '\r\n';
    }
    return str;
}

// 상품 내보내기 (Export)
app.get('/products/export', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    const { results } = await DB.prepare(`
        SELECT sku, name, category, purchase_price, selling_price, current_stock, min_stock_alert, supplier, brand, status
        FROM products 
        WHERE tenant_id = ? AND is_active = 1
        ORDER BY id ASC
    `).bind(tenantId).all()

    const csv = convertToCSV(results);

    // UTF-8 BOM 추가 (엑셀 한글 깨짐 방지)
    const bom = '\uFEFF';
    const finalCsv = bom + csv;

    return c.body(finalCsv, 200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    })
})

// 상품 일괄 등록 (Import)
app.post('/products/import', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    // 파일 파싱 (간단한 CSV 파서 구현)
    const body = await c.req.text()
    const rows = body.split(/\r?\n/).filter(row => row.trim() !== '');

    if (rows.length < 2) {
        return c.json({ success: false, error: '데이터가 없습니다.' }, 400)
    }

    // 헤더 파싱
    const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));

    // 필수 컬럼 확인
    const requiredColumns = ['SKU', '상품명', '판매가', '현재재고'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
        return c.json({ success: false, error: `필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}` }, 400)
    }

    // 데이터 파싱
    const products = [];
    for (let i = 1; i < rows.length; i++) {
        // CSV 라인 파싱 (따옴표 처리 포함)
        const row = rows[i];
        const values: string[] = [];
        let inQuote = false;
        let currentValue = '';

        for (let char of row) {
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue); // 마지막 값

        // 데이터 매핑
        const product: any = {};
        headers.forEach((header, index) => {
            let value = values[index] ? values[index].trim().replace(/^"|"$/g, '').replace(/""/g, '"') : '';

            switch (header) {
                case 'SKU': product.sku = value; break;
                case '상품명': product.name = value; break;
                case '카테고리': product.category = value || '미분류'; break;
                case '매입가': product.purchase_price = parseInt(value) || 0; break;
                case '판매가': product.selling_price = parseInt(value) || 0; break;
                case '현재재고': product.current_stock = parseInt(value) || 0; break;
                case '최소재고알림': product.min_stock_alert = parseInt(value) || 10; break;
                case '공급사': product.supplier = value; break;
                case '브랜드': product.brand = value; break;
                case '상태': product.status = value || 'sale'; break;
            }
        });

        if (product.sku && product.name) {
            products.push(product);
        }
    }

    // 플랜 한도 체크
    const limitCheck = await checkPlanLimit(DB, tenantId, 'products');

    // 현재 등록된 수 + 추가할 수 > 한도 인지 확인
    // checkPlanLimit은 현재 수만 체크하므로, 여기서 추가 계산 필요
    if (!limitCheck.allowed) {
        return c.json({ success: false, error: limitCheck.error }, 403);
    }

    if (limitCheck.limit !== Infinity && (limitCheck.current + products.length) > limitCheck.limit) {
        return c.json({
            success: false,
            error: `업로드할 상품 수(${products.length}개)가 플랜 한도(잔여 ${limitCheck.limit - limitCheck.current}개)를 초과합니다.`
        }, 403);
    }

    // 트랜잭션 처리가 이상적이나 D1은 배치 실행 지원
    // SKU 중복 체크 및 Insert
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // 배치 처리를 위해 쿼리 생성
    // D1은 한 번에 많은 쿼리를 실행하는 batch를 지원하지만, 여기서는 로직이 섞여있어 루프 사용
    // 성능 최적화를 위해 추후 개선 가능

    for (const p of products) {
        try {
            // SKU 중복 확인
            const existing = await DB.prepare('SELECT id FROM products WHERE sku = ? AND tenant_id = ?')
                .bind(p.sku, tenantId).first();

            if (existing) {
                // 업데이트 (선택 사항: 덮어쓰기 모드라면 업데이트, 아니면 스킵)
                // 여기서는 스킵하고 에러로 처리
                failCount++;
                errors.push(`SKU 중복: ${p.sku}`);
                continue;
            }

            await DB.prepare(`
                INSERT INTO products (tenant_id, sku, name, category, purchase_price, selling_price, current_stock, min_stock_alert, supplier, brand, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                tenantId, p.sku, p.name, p.category, p.purchase_price, p.selling_price, p.current_stock, p.min_stock_alert, p.supplier, p.brand, p.status
            ).run();

            // 초기 재고 기록
            if (p.current_stock > 0) {
                const newProduct = await DB.prepare('SELECT id FROM products WHERE sku = ? AND tenant_id = ?').bind(p.sku, tenantId).first<any>();
                if (newProduct) {
                    await DB.prepare(`
                        INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity, reason)
                        VALUES (?, ?, '입고', ?, '대량 등록')
                    `).bind(tenantId, newProduct.id, p.current_stock).run();
                }
            }

            successCount++;
        } catch (e: any) {
            failCount++;
            errors.push(`오류 (${p.sku}): ${e.message}`);
        }
    }

    return c.json({
        success: true,
        message: `${successCount}개 등록 성공, ${failCount}개 실패`,
        errors: errors.slice(0, 10) // 상위 10개 에러만 반환
    })
})

export default app
