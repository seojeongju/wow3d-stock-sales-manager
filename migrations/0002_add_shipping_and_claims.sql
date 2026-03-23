-- Sales 테이블에 배송 정보 추가
ALTER TABLE sales ADD COLUMN shipping_address TEXT;
ALTER TABLE sales ADD COLUMN tracking_number TEXT;
ALTER TABLE sales ADD COLUMN courier TEXT;

-- Claims 테이블 생성 (반품/교환)
CREATE TABLE claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('return', 'exchange')),
  status TEXT NOT NULL DEFAULT 'requested', -- requested, approved, completed, rejected
  reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

-- Claim Items 테이블 (어떤 상품을 몇 개 반품/교환하는지)
CREATE TABLE claim_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  condition TEXT, -- 상품 상태 (good, damaged, etc)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claim_id) REFERENCES claims(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
