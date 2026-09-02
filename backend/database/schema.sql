-- ==========================================================
-- TRAVELTRACK PRO - CLEAN PRODUCTION SUPABASE SCHEMA
-- Rate: ₹2.50 / KM
-- Route: Office (Okhla Hub) -> Customer 1 -> ... -> Engineer Home
-- ==========================================================

-- 1. DROP OLD TABLES IN SAFE ORDER (Cleans any previous conflicting schema)
DROP TABLE IF EXISTS live_gps_pings CASCADE;
DROP TABLE IF EXISTS trip_legs CASCADE;
DROP TABLE IF EXISTS daily_trips CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS engineers CASCADE;
DROP TABLE IF EXISTS offices CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- 2. SYSTEM SETTINGS TABLE
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary_settings',
    default_rate_per_km NUMERIC(6, 2) NOT NULL DEFAULT 2.50,
    currency TEXT DEFAULT '₹',
    admin_username TEXT DEFAULT 'admin',
    admin_password TEXT DEFAULT 'admin123',
    company_name TEXT DEFAULT 'Field Service Engineering Operations',
    company_address TEXT DEFAULT 'Plot 42, Phase III, Okhla Industrial Area, New Delhi 110020',
    company_phone TEXT DEFAULT '+91 11 4988 7700',
    company_email TEXT DEFAULT 'operations@company.in',
    supabase_url TEXT,
    supabase_anon_key TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. OFFICES / START HUBS TABLE
CREATE TABLE offices (
    id TEXT PRIMARY KEY DEFAULT 'off-001',
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    default_rate NUMERIC(6, 2) NOT NULL DEFAULT 2.50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENGINEERS DIRECTORY & CREDENTIALS (Set by Admin)
CREATE TABLE engineers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    login_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '1234',
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    home_address TEXT NOT NULL,
    home_latitude NUMERIC(10, 7) NOT NULL,
    home_longitude NUMERIC(10, 7) NOT NULL,
    vehicle_type TEXT DEFAULT 'Motorcycle/Bike',
    vehicle_number TEXT,
    avatar TEXT DEFAULT '👨‍🔧',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CUSTOMERS / CLIENT SITES
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT NOT NULL,
    pincode TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    city TEXT DEFAULT 'New Delhi',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. JOBS & SERVICE CASES (Enterprise Work Orders & Hardware)
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    call_type TEXT DEFAULT 'DG Call',
    work_order TEXT,
    main_case TEXT,
    serial_no TEXT,
    model_description TEXT,
    otc_code TEXT,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    engineer_id TEXT REFERENCES engineers(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    sequence_order INT DEFAULT 1,
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'assigned' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DAILY TRIPS & REIMBURSEMENT TABLE (@ ₹2.50/KM)
CREATE TABLE daily_trips (
    id TEXT PRIMARY KEY,
    engineer_id TEXT REFERENCES engineers(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    start_office_id TEXT REFERENCES offices(id),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    total_km NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    actual_logged_km NUMERIC(8, 2) DEFAULT 0.00,
    rate_per_km NUMERIC(6, 2) NOT NULL DEFAULT 2.50,
    total_payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'completed', 'approved', 'paid')),
    legs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(engineer_id, trip_date)
);

-- 8. LIVE FLEET GPS PINGS
CREATE TABLE live_gps_pings (
    engineer_id TEXT PRIMARY KEY REFERENCES engineers(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    speed_kmh NUMERIC(5, 1) DEFAULT 0.0,
    accuracy INT DEFAULT 10,
    is_simulated BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 9. DISABLE RLS (Allows seamless direct client read/write)
-- ==========================================================
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE offices DISABLE ROW LEVEL SECURITY;
ALTER TABLE engineers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE live_gps_pings DISABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 10. INSERT INITIAL SYSTEM & HUB CONFIGURATION (Clean Production)
-- ==========================================================
INSERT INTO system_settings (
    id,
    default_rate_per_km,
    currency,
    admin_username,
    admin_password,
    company_name,
    company_address
) VALUES (
    'primary_settings',
    2.50,
    '₹',
    'admin',
    'admin123',
    'Field Service Engineering Operations',
    'Plot 42, Phase III, Okhla Industrial Area, New Delhi 110020'
);

INSERT INTO offices (
    id,
    name,
    address,
    latitude,
    longitude,
    default_rate
) VALUES (
    'off-001',
    'Main Office – Okhla Hub',
    'Plot 42, Phase III, Okhla Industrial Area, New Delhi 110020',
    28.5355100,
    77.2730800,
    2.50
);
