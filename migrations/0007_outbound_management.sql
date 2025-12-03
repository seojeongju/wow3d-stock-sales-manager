-- Stock Lots for FIFO
CREATE TABLE stock_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    lot_number TEXT,
    quantity INTEGER NOT NULL, -- Initial quantity
    remaining_quantity INTEGER NOT NULL, -- Current available
    expiry_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Initialize default lots for existing stock
INSERT INTO stock_lots (product_id, lot_number, quantity, remaining_quantity, created_at)
SELECT id, 'DEFAULT-' || strftime('%Y%m%d', CURRENT_TIMESTAMP), current_stock, current_stock, created_at
FROM products WHERE current_stock > 0;

-- Outbound Orders
CREATE TABLE outbound_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    destination_name TEXT,
    destination_address TEXT,
    destination_phone TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, PICKING, PACKING, SHIPPED, CANCELLED
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Mapping Sales to Outbound Orders (Many-to-One for Merge)
CREATE TABLE outbound_order_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    outbound_order_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);

-- Outbound Items (Details)
CREATE TABLE outbound_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    outbound_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_picked INTEGER DEFAULT 0,
    quantity_packed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING', -- PENDING, PICKED, PACKED
    FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Outbound Packages (Shipping Info)
CREATE TABLE outbound_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    outbound_order_id INTEGER NOT NULL,
    tracking_number TEXT,
    courier TEXT,
    box_type TEXT,
    box_count INTEGER DEFAULT 1,
    weight REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id)
);
