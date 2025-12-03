-- 테스트 상품 데이터
INSERT OR IGNORE INTO products (sku, name, category, description, purchase_price, selling_price, current_stock, min_stock_alert, supplier) VALUES 
  ('PRD001', '노트북 A', '전자제품', '고성능 노트북', 800000, 1200000, 15, 5, '삼성전자'),
  ('PRD002', '무선 마우스 B', '전자제품', '블루투스 무선 마우스', 15000, 30000, 50, 10, 'LG전자'),
  ('PRD003', '키보드 C', '전자제품', '기계식 키보드', 50000, 90000, 30, 10, '로지텍'),
  ('PRD004', '모니터 D', '전자제품', '27인치 4K 모니터', 300000, 500000, 8, 3, '삼성전자'),
  ('PRD005', '책상 E', '가구', '사무용 책상', 100000, 180000, 20, 5, '한샘'),
  ('PRD006', '의자 F', '가구', '사무용 의자', 150000, 250000, 12, 5, '에이스침대'),
  ('PRD007', 'USB 케이블', '액세서리', 'C타입 USB 케이블', 3000, 8000, 100, 20, '벨킨'),
  ('PRD008', '노트북 가방', '액세서리', '15인치 노트북 가방', 20000, 40000, 25, 10, '삼소나이트');

-- 테스트 고객 데이터
INSERT OR IGNORE INTO customers (name, phone, email, address, birthday, grade, notes) VALUES 
  ('김철수', '010-1234-5678', 'kim@example.com', '서울시 강남구', '1985-03-15', 'VIP', '단골 고객'),
  ('이영희', '010-2345-6789', 'lee@example.com', '서울시 서초구', '1990-07-22', '일반', ''),
  ('박민수', '010-3456-7890', 'park@example.com', '경기도 성남시', '1988-11-30', '일반', '대량 구매 선호'),
  ('최지원', '010-4567-8901', 'choi@example.com', '인천시 남동구', '1992-05-18', 'VIP', '');

-- 테스트 판매 데이터
INSERT OR IGNORE INTO sales (customer_id, total_amount, discount_amount, final_amount, payment_method, status) VALUES 
  (1, 1200000, 50000, 1150000, '카드', 'completed'),
  (2, 120000, 0, 120000, '현금', 'completed'),
  (3, 500000, 20000, 480000, '계좌이체', 'completed');

-- 테스트 판매 상세 데이터
INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES 
  (1, 1, 1, 1200000, 1200000),
  (2, 3, 1, 90000, 90000),
  (2, 7, 2, 8000, 16000),
  (2, 8, 1, 40000, 40000),
  (3, 4, 1, 500000, 500000);

-- 테스트 재고 이동 데이터
INSERT OR IGNORE INTO stock_movements (product_id, movement_type, quantity, reason, reference_id) VALUES 
  (1, '입고', 20, '신규 입고', NULL),
  (1, '출고', -1, '판매', 1),
  (3, '입고', 40, '신규 입고', NULL),
  (3, '출고', -1, '판매', 2),
  (7, '입고', 120, '신규 입고', NULL),
  (7, '출고', -2, '판매', 2),
  (8, '입고', 30, '신규 입고', NULL),
  (8, '출고', -1, '판매', 2),
  (4, '입고', 10, '신규 입고', NULL),
  (4, '출고', -1, '판매', 3);

-- 고객 구매 금액 및 횟수 업데이트
UPDATE customers SET total_purchase_amount = 1150000, purchase_count = 1 WHERE id = 1;
UPDATE customers SET total_purchase_amount = 120000, purchase_count = 1 WHERE id = 2;
UPDATE customers SET total_purchase_amount = 480000, purchase_count = 1 WHERE id = 3;
