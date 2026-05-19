-- Migration 08: Add accepted_terms and email to user_profiles and update RLS policies

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.user_profiles.accepted_terms IS 'True if the user has read and accepted terms and conditions';
COMMENT ON COLUMN public.user_profiles.accepted_terms_at IS 'The date and time when the user accepted terms and conditions';
COMMENT ON COLUMN public.user_profiles.email IS 'User login email address for display in admin dashboard';

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

-- Create policy to allow users to update their own profile (specifically accepted_terms)
CREATE POLICY "users_update_own_profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
