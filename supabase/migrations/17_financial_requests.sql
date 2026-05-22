-- Create financial_requests table
CREATE TABLE IF NOT EXISTS public.financial_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions_raw(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('LOAN', 'FINANCIAL_VALUE', 'BILLS')),
    amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.financial_requests ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Offices can SELECT own financial requests"
    ON public.financial_requests FOR SELECT
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can INSERT own financial requests"
    ON public.financial_requests FOR INSERT
    TO public
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can UPDATE own financial requests"
    ON public.financial_requests FOR UPDATE
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid))
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Only managers can DELETE own financial requests"
    ON public.financial_requests FOR DELETE
    TO public
    USING (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );
