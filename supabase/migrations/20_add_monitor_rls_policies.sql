-- Migration: Add RLS Policies for Operations Monitor
-- Enables the monitor role to INSERT guarantors and UPDATE transaction status during manual matchmaking.

-- 1. SELECT and INSERT policies on transaction_guarantors
DROP POLICY IF EXISTS "Monitors can SELECT all guarantors" ON public.transaction_guarantors;
CREATE POLICY "Monitors can SELECT all guarantors"
    ON public.transaction_guarantors FOR SELECT
    TO public
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));

DROP POLICY IF EXISTS "Monitors can INSERT all guarantors" ON public.transaction_guarantors;
CREATE POLICY "Monitors can INSERT all guarantors"
    ON public.transaction_guarantors FOR INSERT
    TO public
    WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));

-- 2. SELECT and UPDATE policies on transactions_raw
DROP POLICY IF EXISTS "Monitors can SELECT all transactions" ON public.transactions_raw;
CREATE POLICY "Monitors can SELECT all transactions"
    ON public.transactions_raw FOR SELECT
    TO public
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));

DROP POLICY IF EXISTS "Monitors can UPDATE transaction status" ON public.transactions_raw;
CREATE POLICY "Monitors can UPDATE transaction status"
    ON public.transactions_raw FOR UPDATE
    TO public
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'))
    WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));
