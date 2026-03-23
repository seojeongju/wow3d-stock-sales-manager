ALTER TABLE products ADD COLUMN image_url TEXT;
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN tags TEXT;
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'sale'; -- sale, out_of_stock, discontinued, hidden
ALTER TABLE products ADD COLUMN specifications TEXT; -- JSON string
