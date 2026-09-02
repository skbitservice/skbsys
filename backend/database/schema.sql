-- ==========================================================
-- TRAVELTRACK PRO - 100% FAIL-PROOF SUPABASE SQL SCHEMA
-- (Standalone columns - No restrictive foreign key errors)
-- ==========================================================

-- 1. DROP EXISTING TABLES IN PUBLIC SCHEMA
DROP TABLE IF EXISTS public.live_gps_pings CASCADE;
DROP TABLE IF EXISTS public.trip_legs CASCADE;
DROP TABLE IF EXISTS public.daily_trips CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.engineers CASCADE;
DROP TABLE IF EXISTS public.offices CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- 2. SYSTEM SETTINGS TABLE
CREATE TABLE public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary_settings',
    default_rate_per_km NUMERIC DEFAULT 2.50,
    currency TEXT DEFAULT '₹',
    admin_username TEXT DEFAULT 'admin',
    admin_password TEXT DEFAULT 'admin123',
    company_name TEXT DEFAULT 'Field Service Operations',
    company_address TEXT DEFAULT 'Phase III, Okhla Industrial Area, New Delhi',
    company_phone TEXT DEFAULT '+91 11 4988 7700',
    company_email TEXT DEFAULT 'operations@company.in',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. OFFICES / START HUBS TABLE
CREATE TABLE public.offices (
    id TEXT PRIMARY KEY DEFAULT 'off-001',
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC NOT NULL DEFAULT 28.53551,
    longitude NUMERIC NOT NULL DEFAULT 77.27308,
    default_rate NUMERIC DEFAULT 2.50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENGINEERS DIRECTORY & PASSWORDS TABLE
CREATE TABLE public.engineers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    login_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '1234',
    phone TEXT NOT NULL,
    email TEXT,
    home_address TEXT NOT NULL,
    home_latitude NUMERIC NOT NULL DEFAULT 28.6083,
    home_longitude NUMERIC NOT NULL DEFAULT 77.2952,
    vehicle_type TEXT DEFAULT 'Motorcycle/Bike',
    vehicle_number TEXT,
    avatar TEXT DEFAULT '👨‍🔧',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CUSTOMERS / CLIENT SITES TABLE
CREATE TABLE public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT NOT NULL,
    pincode TEXT,
    latitude NUMERIC NOT NULL DEFAULT 28.5355,
    longitude NUMERIC NOT NULL DEFAULT 77.2730,
    city TEXT DEFAULT 'New Delhi',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. JOBS & SERVICE CASES TABLE (Enterprise Excel Cases)
CREATE TABLE public.jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    call_type TEXT DEFAULT 'DG Call',
    work_order TEXT,
    main_case TEXT,
    serial_no TEXT,
    model_description TEXT,
    otc_code TEXT,
    customer_id TEXT,
    engineer_id TEXT,
    scheduled_date TEXT NOT NULL,
    sequence_order INT DEFAULT 1,
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'assigned',
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DAILY TRIPS & REIMBURSEMENT TABLE (@ ₹2.50/KM)
CREATE TABLE public.daily_trips (
    id TEXT PRIMARY KEY,
    engineer_id TEXT,
    trip_date TEXT NOT NULL,
    start_office_id TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    total_km NUMERIC DEFAULT 0.00,
    actual_logged_km NUMERIC DEFAULT 0.00,
    rate_per_km NUMERIC DEFAULT 2.50,
    total_payout NUMERIC DEFAULT 0.00,
    status TEXT DEFAULT 'in_progress',
    legs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LIVE FLEET GPS RADAR PINGS
CREATE TABLE public.live_gps_pings (
    engineer_id TEXT PRIMARY KEY,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    speed_kmh NUMERIC DEFAULT 0.0,
    accuracy INT DEFAULT 10,
    is_simulated BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 9. PERMISSIONS: ALLOW ANONYMOUS PUBLIC READ/WRITE ACCESS
-- ==========================================================
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_gps_pings DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.system_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.offices TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.engineers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.jobs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.daily_trips TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.live_gps_pings TO anon, authenticated, service_role;

-- ==========================================================
-- 10. INSERT INITIAL SYSTEM & OFFICE DEFAULTS
-- ==========================================================
INSERT INTO public.system_settings (
    id,
    default_rate_per_km,
    currency,
    admin_username,
    admin_password,
    company_name
) VALUES (
    'primary_settings',
    2.50,
    '₹',
    'admin',
    'admin123',
    'Field Service Engineering Operations'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.offices (
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
) ON CONFLICT (id) DO NOTHING;
