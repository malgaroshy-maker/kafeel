-- ============================================================================
-- FOUNDER / SUPER ADMIN EXTENSION
-- ============================================================================

-- 1. Subscription & Plans for Offices
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'BASIC' CHECK (plan_type IN ('BASIC', 'PREMIUM', 'UNLIMITED'));
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- 2. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES public.offices(id),
    created_by UUID REFERENCES public.user_profiles(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Policies
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offices can view their own tickets"
    ON public.support_tickets FOR SELECT
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can create tickets"
    ON public.support_tickets FOR INSERT
    TO authenticated
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Admins have full access to tickets"
    ON public.support_tickets FOR ALL
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
