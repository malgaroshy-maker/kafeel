-- ============================================================================
-- ALLOW ANONYMOUS BROADCAST SELECT MIGRATION
-- ============================================================================

-- Allow anyone (including anonymous/unauthenticated users on the login screen) to view broadcasts
DROP POLICY IF EXISTS "Anyone authenticated can view broadcasts" ON public.broadcasts;
CREATE POLICY "Anyone can view broadcasts" ON public.broadcasts FOR SELECT USING (true);
