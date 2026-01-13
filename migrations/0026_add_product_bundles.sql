-- 세트 구성 상품 테이블 (Bundle Components)
CREATE TABLE IF NOT EXISTS product_bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  master_product_id INTEGER NOT NULL, -- 세트 상품 (Bundle Product ID)
  component_product_id INTEGER NOT NULL, -- 구성 상품 (Component Product ID)
  quantity INTEGER NOT NULL DEFAULT 1, -- 구성 수량
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (master_product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (component_product_id) REFERENCES products(id)
);

-- 상품 테이블에 세트 여부 컬럼 추가 (이미 있다면 무시됨)
-- ALTER TABLE products ADD COLUMN is_bundle BOOLEAN DEFAULT 0; -- product_type으로 구분 가능 (bundle 추가)

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_product_bundles_master ON product_bundles(master_product_id);
CREATE INDEX IF NOT EXISTS idx_product_bundles_component ON product_bundles(component_product_id);
