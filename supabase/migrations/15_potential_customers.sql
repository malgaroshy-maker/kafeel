-- 1. Create Potential Customers Table
CREATE TABLE IF NOT EXISTS public.potential_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    salary NUMERIC,
    workplace_id UUID REFERENCES public.workplaces(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.potential_customers ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can SELECT own office potential customers" ON public.potential_customers;
CREATE POLICY "Users can SELECT own office potential customers"
    ON public.potential_customers FOR SELECT
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

DROP POLICY IF EXISTS "Users can INSERT own office potential customers" ON public.potential_customers;
CREATE POLICY "Users can INSERT own office potential customers"
    ON public.potential_customers FOR INSERT
    TO authenticated
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

DROP POLICY IF EXISTS "Users can UPDATE own office potential customers" ON public.potential_customers;
CREATE POLICY "Users can UPDATE own office potential customers"
    ON public.potential_customers FOR UPDATE
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid))
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

DROP POLICY IF EXISTS "Users can DELETE own office potential customers" ON public.potential_customers;
CREATE POLICY "Users can DELETE own office potential customers"
    ON public.potential_customers FOR DELETE
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

-- 2. Create Logs Table
CREATE TABLE IF NOT EXISTS public.potential_customer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('ADD', 'DELETE')),
    performed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.potential_customer_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can SELECT own office potential logs" ON public.potential_customer_logs;
CREATE POLICY "Users can SELECT own office potential logs"
    ON public.potential_customer_logs FOR SELECT
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

DROP POLICY IF EXISTS "Users can INSERT own office potential logs" ON public.potential_customer_logs;
CREATE POLICY "Users can INSERT own office potential logs"
    ON public.potential_customer_logs FOR INSERT
    TO authenticated
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));
