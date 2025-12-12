-- Suppliers Table (공급사/거래처)
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  business_number TEXT, -- 사업자번호
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Purchase Orders (발주서)
CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  code TEXT, -- 발주번호 (PO-YYYYMMDD-XXX)
  status TEXT DEFAULT 'DRAFT', -- DRAFT(작성중), ORDERED(발주완료), PARTIAL(부분입고), COMPLETED(입고완료), CANCELLED(취소)
  total_amount REAL DEFAULT 0,
  expected_at DATETIME, -- 입고예정일
  received_at DATETIME, -- 실제입고일 (완료일)
  created_by INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Purchase Items (발주 품목)
CREATE TABLE purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL, -- 발주 수량
  unit_price REAL NOT NULL, -- 발주 단가
  received_quantity INTEGER DEFAULT 0, -- 입고된 수량
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indexes
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_items_order ON purchase_items(purchase_order_id);
