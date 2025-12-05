-- Add created_by column to track user actions
ALTER TABLE sales ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE stock_movements ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE outbound_orders ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE claims ADD COLUMN created_by INTEGER REFERENCES users(id);
