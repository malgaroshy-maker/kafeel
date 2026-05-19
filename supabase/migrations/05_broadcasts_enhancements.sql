-- ============================================================================
-- BROADCASTS ENHANCEMENTS MIGRATION
-- ============================================================================

-- Add new columns to the broadcasts table
ALTER TABLE public.broadcasts
ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'all' CHECK (target_role IN ('all', 'admin', 'office')),
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'success')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
ADD COLUMN IF NOT EXISTS created_by_role TEXT;

-- Create an index to quickly find active broadcasts
CREATE INDEX IF NOT EXISTS idx_broadcasts_expires_at ON public.broadcasts (expires_at);

