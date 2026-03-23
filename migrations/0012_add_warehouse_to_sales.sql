-- Sales 테이블에 warehouse_id 추가
ALTER TABLE sales ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id);
CREATE INDEX idx_sales_warehouse_id ON sales(warehouse_id);
