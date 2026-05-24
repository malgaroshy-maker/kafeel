-- 1. Drop existing insert policies if they exist, then create them
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.banks;
CREATE POLICY "Enable insert access for all authenticated users"
    ON public.banks FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.branches;
CREATE POLICY "Enable insert access for all authenticated users"
    ON public.branches FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 2. Create customer_transfers table if not exists
CREATE TABLE IF NOT EXISTS public.customer_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    from_office_id UUID REFERENCES public.offices(id),
    to_office_id UUID NOT NULL REFERENCES public.offices(id),
    requester_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.customer_transfers IS 'Handles requests to transfer customers/leads between offices.';

-- Enable RLS
ALTER TABLE public.customer_transfers ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies on customer_transfers if any, then create them
DROP POLICY IF EXISTS "Offices can insert transfer requests" ON public.customer_transfers;
CREATE POLICY "Offices can insert transfer requests"
    ON public.customer_transfers FOR INSERT
    TO authenticated
    WITH CHECK (to_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

DROP POLICY IF EXISTS "Offices can read own incoming/outgoing transfers" ON public.customer_transfers;
CREATE POLICY "Offices can read own incoming/outgoing transfers"
    ON public.customer_transfers FOR SELECT
    TO authenticated
    USING (
        from_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        OR to_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    );

DROP POLICY IF EXISTS "Offices can update own incoming/outgoing transfers" ON public.customer_transfers;
CREATE POLICY "Offices can update own incoming/outgoing transfers"
    ON public.customer_transfers FOR UPDATE
    TO authenticated
    USING (
        from_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        OR to_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    )
    WITH CHECK (
        from_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        OR to_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    );
