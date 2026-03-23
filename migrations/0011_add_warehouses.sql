-- 1. Warehouses 테이블 생성
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER REFERENCES tenants(id),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 기본 창고 생성 (기존 데이터를 위해)
-- 주의: tenants 테이블에 데이터가 있어야 함. 0008번 마이그레이션에서 Default Organization이 생성됨.
INSERT INTO warehouses (tenant_id, name, location, description) 
SELECT id, '기본 창고', '본사', '기본 물류 창고' FROM tenants;

-- 3. 상품별 창고 재고 테이블 생성
CREATE TABLE IF NOT EXISTS product_warehouse_stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER REFERENCES tenants(id),
  product_id INTEGER REFERENCES products(id),
  warehouse_id INTEGER REFERENCES warehouses(id),
  quantity INTEGER DEFAULT 0,
  location_code TEXT, -- 랙/빈 위치 (예: A-01-02)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, warehouse_id)
);

-- 4. 기존 재고를 기본 창고로 이관
INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
SELECT p.tenant_id, p.id, w.id, p.current_stock
FROM products p
JOIN warehouses w ON p.tenant_id = w.tenant_id
WHERE w.name = '기본 창고';

-- 5. Stock Movements에 창고 정보 추가
ALTER TABLE stock_movements ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id);
ALTER TABLE stock_movements ADD COLUMN to_warehouse_id INTEGER REFERENCES warehouses(id); -- 창고 이동 시 목적지

-- 기존 이동 기록은 기본 창고로 업데이트
UPDATE stock_movements 
SET warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = stock_movements.tenant_id AND name = '기본 창고')
WHERE warehouse_id IS NULL;

-- 인덱스 생성
CREATE INDEX idx_product_warehouse_stocks_product_id ON product_warehouse_stocks(product_id);
CREATE INDEX idx_product_warehouse_stocks_warehouse_id ON product_warehouse_stocks(warehouse_id);
CREATE INDEX idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);
