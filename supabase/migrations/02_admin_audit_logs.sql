-- ============================================================================
-- ADMIN AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.user_profiles(id),
    action_type TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
    ON public.admin_activity_logs FOR SELECT
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

CREATE POLICY "Admins can insert logs"
    ON public.admin_activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
