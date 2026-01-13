-- Migration: 0028 - Create QR MES Tables
-- Created: 2026-01-13
-- Description: QR 코드 기반 MES(제조실행시스템) 기능을 위한 테이블 생성

-- ================================================
-- 1. QR 코드 마스터 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,                    -- QR 코드 값 (UUID 또는 고유 번호)
  product_id INTEGER,                           -- 제품 ID (products 테이블 참조)
  type TEXT DEFAULT 'product',                  -- QR 타입: 'product', 'batch', 'location'
  status TEXT DEFAULT 'active',                 -- 상태: 'active', 'inactive', 'damaged', 'lost'
  batch_number TEXT,                            -- 로트/배치 번호
  manufacture_date DATE,                        -- 제조일자
  expiry_date DATE,                            -- 유효기간
  metadata TEXT,                               -- JSON 형식의 추가 메타데이터
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,                          -- 생성자 ID (users 테이블 참조)
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- QR 코드 인덱스
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_codes_product ON qr_codes(product_id);
CREATE INDEX idx_qr_codes_status ON qr_codes(status);
CREATE INDEX idx_qr_codes_type ON qr_codes(type);

-- ================================================
-- 2. QR 트랜잭션 이력 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS qr_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_id INTEGER NOT NULL,                 -- QR 코드 ID
  transaction_type TEXT NOT NULL,              -- 트랜잭션 타입: 'inbound', 'outbound', 'sale', 'return', 'adjustment'
  reference_type TEXT,                         -- 참조 타입: 'inbound', 'outbound', 'sale'
  reference_id INTEGER,                        -- 원본 트랜잭션 ID (inbounds.id, outbounds.id, sales.id)
  product_id INTEGER NOT NULL,                 -- 제품 ID
  quantity INTEGER NOT NULL,                   -- 수량 (입고: +, 출고: -)
  warehouse_id INTEGER,                        -- 창고 ID
  location TEXT,                               -- 창고 내 위치 (선반, 구역 등)
  notes TEXT,                                  -- 메모
  device_info TEXT,                           -- 스캔한 디바이스 정보 (User Agent)
  latitude REAL,                              -- GPS 위도 (선택)
  longitude REAL,                             -- GPS 경도 (선택)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- QR 트랜잭션 인덱스
CREATE INDEX idx_qr_trans_code ON qr_transactions(qr_code_id);
CREATE INDEX idx_qr_trans_type ON qr_transactions(transaction_type);
CREATE INDEX idx_qr_trans_product ON qr_transactions(product_id);
CREATE INDEX idx_qr_trans_date ON qr_transactions(created_at);
CREATE INDEX idx_qr_trans_warehouse ON qr_transactions(warehouse_id);

-- ================================================
-- 3. QR 스캔 로그 테이블 (보안 및 추적)
-- ================================================
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code TEXT NOT NULL,                       -- 스캔된 QR 코드
  scan_result TEXT,                            -- 스캔 결과: 'success', 'not_found', 'invalid', 'inactive'
  product_id INTEGER,                          -- 제품 ID (찾았을 경우)
  user_id INTEGER,                             -- 스캔한 사용자 ID
  ip_address TEXT,                             -- IP 주소
  user_agent TEXT,                             -- User Agent
  latitude REAL,                               -- GPS 위도
  longitude REAL,                              -- GPS 경도
  scan_duration_ms INTEGER,                    -- 스캔 소요 시간 (밀리초)
  error_message TEXT,                          -- 에러 메시지 (실패 시)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- QR 스캔 로그 인덱스
CREATE INDEX idx_qr_scan_logs_code ON qr_scan_logs(qr_code);
CREATE INDEX idx_qr_scan_logs_result ON qr_scan_logs(scan_result);
CREATE INDEX idx_qr_scan_logs_date ON qr_scan_logs(created_at);
CREATE INDEX idx_qr_scan_logs_user ON qr_scan_logs(user_id);

-- ================================================
-- 4. QR 라벨 인쇄 이력 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS qr_print_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_id INTEGER NOT NULL,                 -- QR 코드 ID
  print_format TEXT,                           -- 인쇄 포맷: 'label', 'sheet', 'bulk'
  print_size TEXT,                             -- 라벨 크기: '40x30mm', '50x50mm', 'A4' 등
  quantity INTEGER DEFAULT 1,                  -- 인쇄 매수
  printer_name TEXT,                           -- 프린터 이름/IP
  status TEXT DEFAULT 'pending',               -- 상태: 'pending', 'printed', 'failed'
  error_message TEXT,                          -- 에러 메시지
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- QR 인쇄 이력 인덱스
CREATE INDEX idx_qr_print_history_code ON qr_print_history(qr_code_id);
CREATE INDEX idx_qr_print_history_date ON qr_print_history(created_at);

-- ================================================
-- 5. users 테이블에 MES 권한 컬럼 추가
-- ================================================
-- 기존 users 테이블에 MES 전용 권한 컬럼 추가
ALTER TABLE users ADD COLUMN mes_role TEXT DEFAULT 'none';
-- mes_role 값: 'none' (권한 없음), 'viewer' (조회만), 'operator' (작업자), 'admin' (관리자)

-- ================================================
-- 6. 뷰(View) 생성 - QR 트랜잭션 요약
-- ================================================
CREATE VIEW IF NOT EXISTS v_qr_transaction_summary AS
SELECT 
  qt.id,
  qt.transaction_type,
  qt.created_at,
  qc.code AS qr_code,
  p.name AS product_name,
  p.code AS product_code,
  qt.quantity,
  w.name AS warehouse_name,
  u.name AS user_name,
  qt.notes
FROM qr_transactions qt
LEFT JOIN qr_codes qc ON qt.qr_code_id = qc.id
LEFT JOIN products p ON qt.product_id = p.id
LEFT JOIN warehouses w ON qt.warehouse_id = w.id
LEFT JOIN users u ON qt.created_by = u.id
ORDER BY qt.created_at DESC;

-- ================================================
-- 7. 뷰(View) 생성 - QR 코드 재고 현황
-- ================================================
CREATE VIEW IF NOT EXISTS v_qr_stock_status AS
SELECT 
  qc.id AS qr_code_id,
  qc.code AS qr_code,
  qc.type AS qr_type,
  qc.status AS qr_status,
  p.id AS product_id,
  p.name AS product_name,
  p.code AS product_code,
  COALESCE(SUM(
    CASE 
      WHEN qt.transaction_type IN ('inbound', 'return') THEN qt.quantity
      WHEN qt.transaction_type IN ('outbound', 'sale') THEN -qt.quantity
      ELSE 0
    END
  ), 0) AS qr_stock_quantity,
  qc.created_at AS qr_created_at,
  qc.batch_number,
  qc.manufacture_date,
  qc.expiry_date
FROM qr_codes qc
LEFT JOIN products p ON qc.product_id = p.id
LEFT JOIN qr_transactions qt ON qc.id = qt.qr_code_id
WHERE qc.status = 'active'
GROUP BY qc.id, qc.code, qc.type, qc.status, p.id, p.name, p.code, qc.created_at, qc.batch_number, qc.manufacture_date, qc.expiry_date;

-- ================================================
-- 8. 트리거 - QR 코드 생성 시 자동 로그
-- ================================================
CREATE TRIGGER IF NOT EXISTS trg_qr_codes_after_insert
AFTER INSERT ON qr_codes
BEGIN
  INSERT INTO qr_scan_logs (qr_code, scan_result, product_id, user_id)
  VALUES (NEW.code, 'created', NEW.product_id, NEW.created_by);
END;

-- ================================================
-- 9. 트리거 - QR 트랜잭션 생성 시 updated_at 자동 갱신
-- ================================================
CREATE TRIGGER IF NOT EXISTS trg_qr_codes_after_update
AFTER UPDATE ON qr_codes
BEGIN
  UPDATE qr_codes 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.id;
END;

-- ================================================
-- 10. 샘플 데이터 삽입 (테스트용)
-- ================================================
-- 주의: 실제 프로덕션 환경에서는 주석 처리하거나 삭제

-- 샘플 QR 코드 생성 (제품 ID 1-5에 대해)
INSERT INTO qr_codes (code, product_id, type, status, batch_number, created_by)
SELECT 
  'QR' || PRINTF('%08d', id) AS code,
  id AS product_id,
  'product' AS type,
  'active' AS status,
  'BATCH-' || strftime('%Y%m%d', 'now') || '-' || PRINTF('%03d', id) AS batch_number,
  1 AS created_by
FROM products
WHERE id <= 5;

-- ================================================
-- 11. 마이그레이션 완료 로그
-- ================================================
-- 마이그레이션 이력 관리를 위한 별도 테이블이 있다면 여기에 기록
-- 예: INSERT INTO migrations (version, name, applied_at) VALUES (28, 'create_qr_tables', CURRENT_TIMESTAMP);

-- ================================================
-- 마이그레이션 완료
-- ================================================
-- 이 마이그레이션으로 생성된 테이블:
-- 1. qr_codes - QR 코드 마스터
-- 2. qr_transactions - QR 트랜잭션 이력
-- 3. qr_scan_logs - QR 스캔 로그
-- 4. qr_print_history - QR 라벨 인쇄 이력
--
-- 생성된 뷰:
-- 1. v_qr_transaction_summary - QR 트랜잭션 요약
-- 2. v_qr_stock_status - QR 코드별 재고 현황
--
-- 추가된 컬럼:
-- 1. users.mes_role - MES 권한
--
-- 생성된 트리거:
-- 1. trg_qr_codes_after_insert - QR 생성 로그
-- 2. trg_qr_codes_after_update - QR 수정 시 updated_at 갱신
