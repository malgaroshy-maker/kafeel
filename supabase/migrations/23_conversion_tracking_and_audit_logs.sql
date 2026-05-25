-- ============================================================================
-- Migration: 23_conversion_tracking_and_audit_logs.sql
-- Goal: Add Lead Conversion Tracking and Operational Audit Logging
-- Last updated: 2026-05-25
-- ============================================================================

-- 1. Update Potential Customers for Lead Conversion Tracking
ALTER TABLE public.potential_customers 
ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS converted_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.potential_customers.is_converted IS 'Flag indicating if the lead converted into an active customer';
COMMENT ON COLUMN public.potential_customers.converted_customer_id IS 'Reference to the created customer profile after conversion';
COMMENT ON COLUMN public.potential_customers.converted_at IS 'Timestamp of conversion';

-- 2. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details TEXT,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can select audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;

-- Policies for audit_logs
CREATE POLICY "Managers can select audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('manager', 'admin', 'monitor')
        )
    );

CREATE POLICY "Users can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    );
