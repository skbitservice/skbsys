-- ==========================================================
-- ENGINEER TRAVEL DISTANCE & PAYOUT SYSTEM
-- Database Schema for Supabase / PostgreSQL
-- Route: Office (Okhla) -> Cust 1 -> Cust 2 -> ... -> Cust N -> Home
-- Rate: ₹2.50 / KM
-- ==========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. OFFICES TABLE
CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    default_rate DECIMAL(6, 2) NOT NULL DEFAULT 2.50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ENGINEERS TABLE
CREATE TABLE IF NOT EXISTS engineers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    home_address TEXT NOT NULL,
    home_latitude DECIMAL(10, 7) NOT NULL,
    home_longitude DECIMAL(10, 7) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'Motorcycle/Bike',
    vehicle_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    landmark VARCHAR(255),
    city VARCHAR(100) DEFAULT 'New Delhi',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. JOBS / SERVICE CASES TABLE
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    engineer_id UUID REFERENCES engineers(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    sequence_order INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    customer_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DAILY TRIPS TABLE
CREATE TABLE IF NOT EXISTS daily_trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engineer_id UUID REFERENCES engineers(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    start_office_id UUID REFERENCES offices(id),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    total_km DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    rate_per_km DECIMAL(6, 2) NOT NULL DEFAULT 2.50,
    total_payout DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'completed', 'approved', 'paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(engineer_id, trip_date)
);

-- 6. TRIP LEGS (Each segment: Office->C1, C1->C2, ..., Cn->Home)
CREATE TABLE IF NOT EXISTS trip_legs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES daily_trips(id) ON DELETE CASCADE,
    leg_order INT NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    from_type VARCHAR(50) NOT NULL CHECK (from_type IN ('office', 'customer', 'home')),
    from_lat DECIMAL(10, 7) NOT NULL,
    from_lng DECIMAL(10, 7) NOT NULL,
    to_name VARCHAR(255) NOT NULL,
    to_type VARCHAR(50) NOT NULL CHECK (to_type IN ('office', 'customer', 'home')),
    to_lat DECIMAL(10, 7) NOT NULL,
    to_lng DECIMAL(10, 7) NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    distance_km DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    rate_per_km DECIMAL(6, 2) NOT NULL DEFAULT 2.50,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- ANALYTICAL VIEWS
-- ==========================================================

-- Daily Summary View
CREATE OR REPLACE VIEW v_daily_payout_summary AS
SELECT 
    dt.id AS trip_id,
    dt.trip_date,
    e.id AS engineer_id,
    e.name AS engineer_name,
    e.phone AS engineer_phone,
    e.vehicle_number,
    dt.total_km,
    dt.rate_per_km,
    dt.total_payout,
    dt.status AS trip_status,
    COUNT(tl.id) AS total_legs,
    MIN(tl.started_at) AS first_start_time,
    MAX(tl.completed_at) AS final_end_time
FROM daily_trips dt
JOIN engineers e ON dt.engineer_id = e.id
LEFT JOIN trip_legs tl ON dt.id = tl.trip_id
GROUP BY dt.id, dt.trip_date, e.id, e.name, e.phone, e.vehicle_number, dt.total_km, dt.rate_per_km, dt.total_payout, dt.status;

-- Monthly Engineer Payout Aggregate View
CREATE OR REPLACE VIEW v_monthly_engineer_payouts AS
SELECT 
    TO_CHAR(dt.trip_date, 'YYYY-MM') AS payout_month,
    e.id AS engineer_id,
    e.name AS engineer_name,
    e.phone AS engineer_phone,
    e.vehicle_number,
    COUNT(dt.id) AS total_working_days,
    SUM(dt.total_km) AS total_month_km,
    AVG(dt.rate_per_km) AS avg_rate,
    SUM(dt.total_payout) AS gross_payout_amount,
    COUNT(CASE WHEN dt.status = 'approved' THEN 1 END) AS approved_trips_count,
    COUNT(CASE WHEN dt.status = 'paid' THEN 1 END) AS paid_trips_count
FROM daily_trips dt
JOIN engineers e ON dt.engineer_id = e.id
GROUP BY TO_CHAR(dt.trip_date, 'YYYY-MM'), e.id, e.name, e.phone, e.vehicle_number;

-- ==========================================================
-- SEED INITIAL DATA (DELHI NCR & OKHLA HEADQUARTERS)
-- ==========================================================

-- Insert Main Office (Okhla Hub)
INSERT INTO offices (id, name, address, latitude, longitude, default_rate)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Main Office – Okhla Hub',
    'Phase III, Okhla Industrial Area, New Delhi, Delhi 110020',
    28.5355100,
    77.2730800,
    2.50
) ON CONFLICT (id) DO NOTHING;

-- Insert System Settings
INSERT INTO system_settings (key, value, description)
VALUES 
    ('default_rate_per_km', '2.50', 'Reimbursement rate per kilometer in INR (₹)'),
    ('default_office_id', '"11111111-1111-1111-1111-111111111111"', 'Primary office starting point'),
    ('company_info', '{"name": "FastTech Service Engineering Ltd", "address": "Okhla Phase III, New Delhi", "phone": "+91 11 4567 8900", "currency": "₹"}', 'Company details for PDF statements')
ON CONFLICT (key) DO NOTHING;

-- Insert Sample Engineers
INSERT INTO engineers (id, name, phone, email, home_address, home_latitude, home_longitude, vehicle_type, vehicle_number)
VALUES 
    (
        '22222222-2222-2222-2222-222222222221',
        'Rahul Kumar Sharma',
        '+91 98765 43210',
        'rahul.sharma@fasttech.in',
        'Pocket 1, Mayur Vihar Phase 1, New Delhi, Delhi 110091',
        28.6083000,
        77.2952000,
        'Honda Shine 125',
        'DL 3S CM 4821'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Amit Verma',
        '+91 98111 22334',
        'amit.verma@fasttech.in',
        'Sector 15, Rohini, New Delhi, Delhi 110089',
        28.7208000,
        77.1264000,
        'Bajaj Pulsar 150',
        'DL 8S BK 9142'
    ),
    (
        '22222222-2222-2222-2222-222222222223',
        'Vikas Singh',
        '+91 99223 34455',
        'vikas.singh@fasttech.in',
        'Sector 56, Gurgaon, Haryana 122011',
        28.4285000,
        77.0984000,
        'Hero Splendor Plus',
        'HR 26 DQ 7780'
    )
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Customers in Delhi NCR
INSERT INTO customers (id, name, phone, address, latitude, longitude, landmark, city)
VALUES 
    (
        '33333333-3333-3333-3333-333333333331',
        'Rajesh Electronics & Retail',
        '+91 98100 12345',
        'Central Market, Lajpat Nagar II, New Delhi',
        28.5677000,
        77.2433000,
        'Near Metro Gate 2',
        'New Delhi'
    ),
    (
        '33333333-3333-3333-3333-333333333332',
        'Apex Infotech Pvt Ltd',
        '+91 98100 23456',
        'Nehru Place Commercial Complex, New Delhi',
        28.5494000,
        77.2530000,
        'Eros Tower 4th Floor',
        'New Delhi'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Global Health Diagnostics',
        '+91 98100 34567',
        'Block B, Sector 62, Noida, Uttar Pradesh',
        28.6280000,
        77.3649000,
        'Near Stellar IT Park',
        'Noida'
    ),
    (
        '33333333-3333-3333-3333-333333333334',
        'Supreme Mart',
        '+91 98100 45678',
        'Select Citywalk, Saket District Centre, New Delhi',
        28.5284000,
        77.2185000,
        'Opposite Max Hospital',
        'New Delhi'
    )
ON CONFLICT (id) DO NOTHING;
