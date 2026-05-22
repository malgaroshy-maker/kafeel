-- ============================================================================
-- SAAS ADVANCED FEATURES MIGRATION
-- ============================================================================

-- 1. Broadcast Announcements Table
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.user_profiles(id)
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view broadcasts" ON public.broadcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins and monitors can manage broadcasts" ON public.broadcasts FOR ALL TO authenticated USING (((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'monitor')));

-- 2. License / Activation Keys Table
CREATE TABLE IF NOT EXISTS public.license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT NOT NULL UNIQUE,
    plan_type TEXT DEFAULT 'BASIC' CHECK (plan_type IN ('BASIC', 'PREMIUM', 'UNLIMITED')),
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_used BOOLEAN DEFAULT false,
    used_by_office_id UUID REFERENCES public.offices(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access to license keys" ON public.license_keys FOR ALL TO authenticated USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
CREATE POLICY "Offices can read license keys to activate" ON public.license_keys FOR SELECT TO authenticated USING (true);

-- 3. Resellers Table
CREATE TABLE IF NOT EXISTS public.resellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    commission_rate NUMERIC DEFAULT 10.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can manage resellers" ON public.resellers FOR ALL TO authenticated USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
