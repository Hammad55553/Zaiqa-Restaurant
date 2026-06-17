-- ZAIQAH POS - FULL DATABASE SETUP SCRIPT FOR SUPABASE
-- Copy and run this script in the Supabase SQL Editor once to initialize all tables.

-- Disable foreign key constraints during table creation to avoid order issues
SET check_function_bodies = false;

-- 1. Users Table (Cashiers, Waiters, Admins, Riders details, PINs, Passwords)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Holds local password/PIN
  role TEXT NOT NULL, -- admin, cashier, waiter, kitchen, rider
  permissions TEXT, -- JSON permission array string
  name TEXT
);

-- 2. Tables Table (Floor layout management)
CREATE TABLE IF NOT EXISTS tables (
  id BIGINT PRIMARY KEY,
  table_number TEXT UNIQUE NOT NULL,
  area TEXT NOT NULL, -- Male, Family, Lawn, etc.
  seats INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available' -- available, dining, reserved
);

-- 3. Categories Table (Menu categorization)
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 4. Items Table (Menu dishes and prices)
CREATE TABLE IF NOT EXISTS items (
  id BIGINT PRIMARY KEY,
  category_id BIGINT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  image TEXT
);

-- 5. Orders Table (Sales summary, order totals, returns)
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY,
  table_number TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'Main',
  customer_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, preparing, ready, completed, cancelled, returned
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  remarks TEXT, -- Hold addresses / general notes
  admin_edit_remark TEXT,
  has_new_updates BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  items JSONB -- Denormalized order items copy for easy reporting
);

-- 6. Order Items Table (KOT items list)
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY,
  order_id BIGINT,
  item_id TEXT,
  item_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'preparing' -- preparing, cooked, cancelled
);

-- 7. Stock Items Table (Raw ingredients inventory levels)
CREATE TABLE IF NOT EXISTS stock_items (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  min_alert REAL DEFAULT 0
);

-- 8. Stock Logs Table (Inventory audits and changes log)
CREATE TABLE IF NOT EXISTS stock_logs (
  id BIGINT PRIMARY KEY,
  item_id BIGINT,
  action TEXT, -- add, remove, set
  qty_changed REAL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Item Ingredients Table (Recipes / Bill of Materials)
CREATE TABLE IF NOT EXISTS item_ingredients (
  id BIGINT PRIMARY KEY,
  menu_item_id BIGINT,
  stock_item_id BIGINT,
  quantity_required REAL NOT NULL
);

-- 10. Suppliers Table (Supplier profiles)
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  contact TEXT,
  balance REAL DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Supplier Ledger Table (Purchase receipts and supplier balance log)
CREATE TABLE IF NOT EXISTS supplier_ledger (
  id BIGINT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  type TEXT NOT NULL, -- Stock Purchase, Payment Made, Opening Balance
  amount REAL NOT NULL,
  note TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Expenses Table (Daily costs, bills)
CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT PRIMARY KEY,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Customers Table (Khata Ledger profiles)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  type TEXT DEFAULT 'Client', -- Client, Company
  balance REAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Customer Ledger Table (Credit accounts audit entries)
CREATE TABLE IF NOT EXISTS customer_ledger (
  id BIGINT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL, -- credit, payment
  amount REAL NOT NULL,
  note TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Delivery Orders Table (Home delivery status tracking)
CREATE TABLE IF NOT EXISTS delivery_orders (
  id BIGINT PRIMARY KEY,
  order_ref_id TEXT UNIQUE,
  backend_order_id TEXT,
  customer_name TEXT,
  phone TEXT,
  address TEXT,
  rider_name TEXT,
  payment_method TEXT DEFAULT 'cod', -- cod, online, khata
  transaction_id TEXT,
  remarks TEXT,
  delivery_status TEXT DEFAULT 'pending', -- pending, out-for-delivery, delivered, cancelled
  khata_charged INTEGER DEFAULT 0,
  khata_customer_id TEXT,
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  items JSONB -- Holds the nested items array
);

-- 16. Delivery Order Items Table (Home delivery food items)
CREATE TABLE IF NOT EXISTS delivery_order_items (
  id BIGINT PRIMARY KEY,
  delivery_order_id BIGINT,
  item_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- 17. Prepared Waste Table (Prepared food waste / cancelled orders audit)
CREATE TABLE IF NOT EXISTS prepared_waste (
  id BIGINT PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Prepared Waste Outflow Table (Staff, Owner consumption or spoiled food log)
CREATE TABLE IF NOT EXISTS prepared_waste_outflow (
  id BIGINT PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  destination TEXT NOT NULL, -- Staff Consumed, Owner Consumed, Spoiled/Discarded, Other
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);