-- Claims 테이블에 warehouse_id 추가
ALTER TABLE claims ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id);
