-- 1. Tenants 테이블 생성
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'FREE', -- FREE, BASIC, PRO
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, CANCELLED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 기본 Tenant 생성 (기존 데이터를 위한)
INSERT INTO tenants (name, plan_type) VALUES ('Default Organization', 'PRO');

-- 3. Users 테이블에 tenant_id 추가
ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 4. 주요 테이블에 tenant_id 추가 및 데이터 마이그레이션

-- Products
ALTER TABLE products ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
UPDATE products SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Customers
ALTER TABLE customers ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
UPDATE customers SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Sales
ALTER TABLE sales ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
UPDATE sales SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Stock Movements
ALTER TABLE stock_movements ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
UPDATE stock_movements SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Outbound Orders
ALTER TABLE outbound_orders ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
UPDATE outbound_orders SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Claims
ALTER TABLE claims ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
UPDATE claims SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Sale Items (선택 사항: 부모인 sales에 tenant_id가 있지만, 조인 성능 및 편의를 위해 추가할 수도 있음. 일단은 정규화 원칙에 따라 생략 가능하지만, RLS 적용 시 편리함을 위해 추가하는 경우도 많음. 여기서는 주요 엔티티 위주로 추가)
-- Sale Items는 Sales에 종속적이므로 굳이 추가하지 않아도 되지만, 쿼리 편의성을 위해 추가할 수도 있음. 일단 보류.

-- Outbound Items, Outbound Packages, Outbound Sales 등도 부모 테이블을 따름.

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX idx_stock_movements_tenant_id ON stock_movements(tenant_id);
CREATE INDEX idx_outbound_orders_tenant_id ON outbound_orders(tenant_id);
CREATE INDEX idx_claims_tenant_id ON claims(tenant_id);
