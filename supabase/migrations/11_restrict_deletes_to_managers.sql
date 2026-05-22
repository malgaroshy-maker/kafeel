-- ============================================================================
-- Migration: Restrict DELETE Actions to Managers Only
-- Order: Split FOR ALL policies into SELECT, INSERT, UPDATE, and DELETE
-- ============================================================================

-- Drop old ALL policies
DROP POLICY IF EXISTS "Offices can only access their own customers" ON public.customers;
DROP POLICY IF EXISTS "Offices can only access their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Offices can only access guarantors of their transactions" ON public.transaction_guarantors;
DROP POLICY IF EXISTS "Offices can access their own settlements" ON public.settlements;

-- Drop SELECT, INSERT, UPDATE, DELETE policies if they already exist
DROP POLICY IF EXISTS "Offices can SELECT own customers" ON public.customers;
DROP POLICY IF EXISTS "Offices can INSERT own customers" ON public.customers;
DROP POLICY IF EXISTS "Offices can UPDATE own customers" ON public.customers;
DROP POLICY IF EXISTS "Only managers can DELETE own customers" ON public.customers;

DROP POLICY IF EXISTS "Offices can SELECT own transactions" ON public.transactions_raw;
DROP POLICY IF EXISTS "Offices can INSERT own transactions" ON public.transactions_raw;
DROP POLICY IF EXISTS "Offices can UPDATE own transactions" ON public.transactions_raw;
DROP POLICY IF EXISTS "Only managers can DELETE own transactions" ON public.transactions_raw;

DROP POLICY IF EXISTS "Offices can SELECT own guarantors" ON public.transaction_guarantors;
DROP POLICY IF EXISTS "Offices can INSERT own guarantors" ON public.transaction_guarantors;
DROP POLICY IF EXISTS "Offices can UPDATE own guarantors" ON public.transaction_guarantors;
DROP POLICY IF EXISTS "Only managers can DELETE own guarantors" ON public.transaction_guarantors;

DROP POLICY IF EXISTS "Offices can SELECT own settlements" ON public.settlements;
DROP POLICY IF EXISTS "Offices can INSERT own settlements" ON public.settlements;
DROP POLICY IF EXISTS "Offices can UPDATE own settlements" ON public.settlements;
DROP POLICY IF EXISTS "Only managers can DELETE own settlements" ON public.settlements;

-- 1. CUSTOMERS POLICIES
CREATE POLICY "Offices can SELECT own customers"
    ON public.customers FOR SELECT
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can INSERT own customers"
    ON public.customers FOR INSERT
    TO public
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can UPDATE own customers"
    ON public.customers FOR UPDATE
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid))
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Only managers can DELETE own customers"
    ON public.customers FOR DELETE
    TO public
    USING (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );

-- 2. TRANSACTIONS POLICIES
CREATE POLICY "Offices can SELECT own transactions"
    ON public.transactions_raw FOR SELECT
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can INSERT own transactions"
    ON public.transactions_raw FOR INSERT
    TO public
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can UPDATE own transactions"
    ON public.transactions_raw FOR UPDATE
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid))
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Only managers can DELETE own transactions"
    ON public.transactions_raw FOR DELETE
    TO public
    USING (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );

-- 3. TRANSACTION GUARANTORS POLICIES
CREATE POLICY "Offices can SELECT own guarantors"
    ON public.transaction_guarantors FOR SELECT
    TO public
    USING (transaction_id IN (
        SELECT id FROM transactions
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ));

CREATE POLICY "Offices can INSERT own guarantors"
    ON public.transaction_guarantors FOR INSERT
    TO public
    WITH CHECK (transaction_id IN (
        SELECT id FROM transactions
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ));

CREATE POLICY "Offices can UPDATE own guarantors"
    ON public.transaction_guarantors FOR UPDATE
    TO public
    USING (transaction_id IN (
        SELECT id FROM transactions
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ))
    WITH CHECK (transaction_id IN (
        SELECT id FROM transactions
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ));

CREATE POLICY "Only managers can DELETE own guarantors"
    ON public.transaction_guarantors FOR DELETE
    TO public
    USING (
        transaction_id IN (
            SELECT id FROM transactions
            WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        )
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );

-- 4. SETTLEMENTS POLICIES
CREATE POLICY "Offices can SELECT own settlements"
    ON public.settlements FOR SELECT
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can INSERT own settlements"
    ON public.settlements FOR INSERT
    TO authenticated
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can UPDATE own settlements"
    ON public.settlements FOR UPDATE
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid))
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Only managers can DELETE own settlements"
    ON public.settlements FOR DELETE
    TO authenticated
    USING (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );
