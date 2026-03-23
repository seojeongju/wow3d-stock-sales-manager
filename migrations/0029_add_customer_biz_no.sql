-- Migration: 0029 - Add business_number to customers
ALTER TABLE customers ADD COLUMN business_number TEXT;
