-- Add warehouse_id to outbound_orders
ALTER TABLE outbound_orders ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id);

-- Optional: Update existing orders to a default warehouse?
-- UPDATE outbound_orders SET warehouse_id = (SELECT id FROM warehouses WHERE name = '기본 창고' AND tenant_id = outbound_orders.tenant_id);
