-- 고객 등급 및 커스텀 가격 정책 시스템

-- 1. 고객 테이블에 등급 컬럼 추가
-- ALTER TABLE customers ADD COLUMN grade TEXT DEFAULT '일반';

-- 2. 등급별 상품 가격 테이블
CREATE TABLE IF NOT EXISTS product_grade_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    grade TEXT NOT NULL, -- 'VIP', '도매', '대리점' 등
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(tenant_id, product_id, grade)
);

-- 3. 고객별 전용 상품 가격 테이블 (수동 설정용)
CREATE TABLE IF NOT EXISTS product_customer_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(tenant_id, customer_id, product_id)
);
