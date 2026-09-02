-- ==========================================================
-- SUPABASE RLS UNLOCK SCRIPT (ALLOW READ/WRITE FOR WEB APPS)
-- Run this in Supabase SQL Editor
-- ==========================================================

-- 1. Disable Row Level Security on all tables
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_gps_pings DISABLE ROW LEVEL SECURITY;

-- 2. Drop any old restrictive policies if any
DROP POLICY IF EXISTS "Allow public all on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public all on offices" ON public.offices;
DROP POLICY IF EXISTS "Allow public all on engineers" ON public.engineers;
DROP POLICY IF EXISTS "Allow public all on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public all on jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public all on daily_trips" ON public.daily_trips;
DROP POLICY IF EXISTS "Allow public all on live_gps_pings" ON public.live_gps_pings;

-- 3. Grant full permissions to anon & authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
