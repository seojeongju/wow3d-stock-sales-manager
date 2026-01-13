-- Add tenant_id and warehouse_id to outbound_orders for proper multi-tenancy
ALTER TABLE outbound_orders ADD COLUMN tenant_id INTEGER;
ALTER TABLE outbound_orders ADD COLUMN warehouse_id INTEGER;

-- Update existing outbound_orders to have tenant_id from the first associated sale
UPDATE outbound_orders
SET tenant_id = (
    SELECT s.tenant_id 
    FROM outbound_order_mappings oom
    JOIN sales s ON oom.sale_id = s.id
    WHERE oom.outbound_order_id = outbound_orders.id
    LIMIT 1
);

-- Create index for better performance
CREATE INDEX idx_outbound_orders_tenant ON outbound_orders(tenant_id);
CREATE INDEX idx_outbound_order_mappings_sale ON outbound_order_mappings(sale_id);
CREATE INDEX idx_outbound_packages_outbound_order ON outbound_packages(outbound_order_id);
