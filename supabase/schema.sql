-- ============================================================================
-- Kafeel (كفيل) — Complete Database Schema
-- Supabase (PostgreSQL) | Last updated: 2026-05-16
-- ============================================================================
-- Run this file against a fresh Supabase project to set up the entire database.
-- Order matters: tables are created dependency-first.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ---- WORKPLACES ----
CREATE TABLE IF NOT EXISTS public.workplaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    required_guarantors INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.workplaces IS 'Employer/workplace registry. required_guarantors: 1 for public sector, 2 for classified contracts.';

-- ---- OFFICES ----
CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_users INTEGER DEFAULT 4,
    join_code TEXT UNIQUE,
    join_code_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.offices IS 'Tenant offices. Each office has a unique join code for user self-registration.';

-- ---- USER PROFILES ----
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    office_id UUID REFERENCES public.offices(id),
    role TEXT NOT NULL DEFAULT 'staff'
        CHECK (role IN ('admin', 'monitor', 'manager', 'accountant', 'staff')),
    display_name TEXT DEFAULT '',
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    accepted_terms BOOLEAN NOT NULL DEFAULT false,
    accepted_terms_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS 'Maps auth.users to offices with role assignments.';
COMMENT ON COLUMN public.user_profiles.accepted_terms IS 'True if the user has read and accepted terms and conditions';
COMMENT ON COLUMN public.user_profiles.accepted_terms_at IS 'The date and time when the user accepted terms and conditions';
COMMENT ON COLUMN public.user_profiles.email IS 'User login email address for display in admin dashboard';

-- ---- BANKS ----
CREATE TABLE IF NOT EXISTS public.banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.banks IS 'Bank registry (e.g., Jumhouria Bank).';

-- ---- BRANCHES ----
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    region TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.branches IS 'Bank branch registry with regional tagging.';

-- ---- CUSTOMERS ----
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id),
    national_id TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    salary NUMERIC,
    workplace_id UUID REFERENCES public.workplaces(id),
    gender TEXT,
    birth_year INTEGER,
    bank_id UUID REFERENCES public.banks(id),
    branch_id UUID REFERENCES public.branches(id),
    account_number TEXT,
    phone_private TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.customers IS 'Customer registry. national_id is globally unique to prevent cross-office duplication.';

-- ---- TRANSACTIONS ----
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    workplace_id UUID REFERENCES public.workplaces(id),
    car_price NUMERIC NOT NULL DEFAULT 0,
    bank_ceiling NUMERIC NOT NULL DEFAULT 0,
    margin_rate NUMERIC NOT NULL DEFAULT 0,
    down_payment NUMERIC NOT NULL DEFAULT 0,
    total_installments NUMERIC NOT NULL DEFAULT 0,
    office_loan NUMERIC DEFAULT 0,
    car_model TEXT,
    purchase_cost NUMERIC,
    is_files_complete BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'PENDING',
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    guarantors_needed INTEGER NOT NULL DEFAULT 1,
    has_notary_pledge BOOLEAN DEFAULT false,
    market_sale_price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Murabaha transaction lifecycle. Status: PENDING → WAITING_MATCH → MATCHED → ACTIVE → COMPLETED.';
COMMENT ON COLUMN public.transactions.purchase_cost IS 'Actual car cost for the office. Hidden from staff/monitors for profit calculation.';
COMMENT ON COLUMN public.transactions.verification_status IS 'Status of the document verification process by manager/accountant';
COMMENT ON COLUMN public.transactions.rejection_reason IS 'Reason for document rejection by manager/accountant';

-- ---- TRANSACTION GUARANTORS ----
CREATE TABLE IF NOT EXISTS public.transaction_guarantors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id),
    guarantor_name TEXT NOT NULL,
    guarantor_national_id TEXT NOT NULL,
    workplace_id UUID REFERENCES public.workplaces(id),
    match_type TEXT NOT NULL DEFAULT 'MANUAL',
    match_status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.transaction_guarantors IS 'Links guarantors to transactions. match_type: AUTO, MANUAL, OVERRIDE.';

-- ---- SETTLEMENTS ----
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id),
    office_id UUID NOT NULL REFERENCES public.offices(id),
    settlement_type TEXT NOT NULL
        CHECK (settlement_type IN ('PERSONAL_USE', 'CASH_OUT', 'EXTERNAL_SALE')),
    down_payment_collected NUMERIC DEFAULT 0,
    debt_amount NUMERIC DEFAULT 0,
    sale_price NUMERIC,
    office_commission NUMERIC DEFAULT 0,
    net_cash NUMERIC DEFAULT 0,
    external_sale_deadline TIMESTAMPTZ,
    external_sale_completed BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
    notes TEXT,
    check_image_url TEXT,
    shipping_cost NUMERIC DEFAULT 0,
    staff_commission NUMERIC DEFAULT 0,
    promissory_notes_count INTEGER DEFAULT 0,
    promissory_notes_details TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.settlements IS 'Post-delivery settlements: Personal Use, Cash-out, or External Sale.';
COMMENT ON COLUMN public.settlements.check_image_url IS 'Path to uploaded check/guarantee image in Supabase Storage.';


-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- ---- WORKPLACES ----
CREATE POLICY "Public read workplaces"
    ON public.workplaces FOR SELECT
    TO public
    USING (true);

-- ---- OFFICES ----
CREATE POLICY "Offices can SELECT own details"
    ON public.offices FOR SELECT
    TO authenticated
    USING (
        id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'monitor')
    );

CREATE POLICY "Admins have full access to offices"
    ON public.offices FOR ALL
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

CREATE POLICY "Monitors can read offices"
    ON public.offices FOR SELECT
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));

-- ---- USER PROFILES ----
CREATE POLICY "users_read_own_profile"
    ON public.user_profiles FOR SELECT
    TO public
    USING (id = auth.uid());

CREATE POLICY "users_update_own_profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "admin_full_access_profiles"
    ON public.user_profiles FOR ALL
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

CREATE POLICY "managers_read_office_profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );

-- ---- BANKS ----
CREATE POLICY "Enable read access for all authenticated users"
    ON public.banks FOR SELECT
    TO public
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable full access for admins"
    ON public.banks FOR ALL
    TO public
    USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    ));

-- ---- BRANCHES ----
CREATE POLICY "Enable read access for all authenticated users"
    ON public.branches FOR SELECT
    TO public
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable full access for admins"
    ON public.branches FOR ALL
    TO public
    USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    ));

-- ---- CUSTOMERS ----
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

CREATE POLICY "Admins have full access to customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

CREATE POLICY "Monitors can read customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));

-- ---- TRANSACTIONS ----
CREATE POLICY "Offices can SELECT own transactions"
    ON public.transactions FOR SELECT
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can INSERT own transactions"
    ON public.transactions FOR INSERT
    TO public
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can UPDATE own transactions"
    ON public.transactions FOR UPDATE
    TO public
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid))
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Only managers can DELETE own transactions"
    ON public.transactions FOR DELETE
    TO public
    USING (
        office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );

CREATE POLICY "Admins have full access to transactions"
    ON public.transactions FOR ALL
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

CREATE POLICY "Monitors can read transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));

-- ---- TRANSACTION GUARANTORS ----
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

CREATE POLICY "Admins have full access to transaction_guarantors"
    ON public.transaction_guarantors FOR ALL
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

CREATE POLICY "Monitors can read transaction_guarantors"
    ON public.transaction_guarantors FOR SELECT
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));

-- ---- SETTLEMENTS ----
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

CREATE POLICY "Admins have full access to settlements"
    ON public.settlements FOR ALL
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));

CREATE POLICY "Monitors can read settlements"
    ON public.settlements FOR SELECT
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'monitor'));


-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- ---- Generate Join Code ----
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := upper(substr(md5(random()::text || now()::text), 1, 6));
        SELECT EXISTS(SELECT 1 FROM public.offices WHERE join_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

COMMENT ON FUNCTION public.generate_join_code IS 'Generates a unique 6-character alphanumeric join code for offices.';

-- ---- Get Office User Count ----
CREATE OR REPLACE FUNCTION public.get_office_user_count(target_office_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::integer
    FROM public.user_profiles
    WHERE office_id = target_office_id AND is_active = true;
$$;

-- ---- Find Potential Guarantors ----
CREATE OR REPLACE FUNCTION public.find_potential_guarantors(
    p_beneficiary_id UUID,
    p_transaction_id UUID,
    p_override_validation BOOLEAN DEFAULT false
)
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    customer_national_id TEXT,
    customer_office_id UUID,
    office_name TEXT,
    customer_workplace TEXT,
    customer_salary NUMERIC,
    salary_diff NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workplace_id UUID;
    v_salary NUMERIC;
BEGIN
    -- Get beneficiary's workplace and salary
    SELECT c.workplace_id, c.salary
    INTO v_workplace_id, v_salary
    FROM customers c
    WHERE c.id = p_beneficiary_id;

    IF v_workplace_id IS NULL OR v_salary IS NULL THEN
        RAISE EXCEPTION 'Beneficiary workplace or salary not set';
    END IF;

    RETURN QUERY
    SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.national_id AS customer_national_id,
        c.office_id AS customer_office_id,
        o.name AS office_name,
        w.name AS customer_workplace,
        c.salary AS customer_salary,
        ABS(c.salary - v_salary) AS salary_diff
    FROM customers c
    JOIN offices o ON o.id = c.office_id
    LEFT JOIN workplaces w ON w.id = c.workplace_id
    WHERE c.id != p_beneficiary_id
      -- Same workplace (skip if override)
      AND (p_override_validation OR c.workplace_id = v_workplace_id)
      -- Salary diff <= 50 LYD (skip if override)
      AND (p_override_validation OR ABS(c.salary - v_salary) <= 50)
      -- Not already a guarantor on this transaction
      AND c.national_id NOT IN (
          SELECT tg.guarantor_national_id
          FROM transaction_guarantors tg
          WHERE tg.transaction_id = p_transaction_id
      )
      -- Not already a beneficiary on an active transaction
      AND c.id NOT IN (
          SELECT t.customer_id
          FROM transactions t
          WHERE t.status IN ('ACTIVE', 'COMPLETED')
      )
    ORDER BY salary_diff ASC;
END;
$$;

COMMENT ON FUNCTION public.find_potential_guarantors IS 'Finds matching guarantors: same workplace + salary diff ≤ 50 LYD. Override available for monitors.';

-- ---- Attempt Auto Match ----
CREATE OR REPLACE FUNCTION public.attempt_auto_match(p_transaction_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_beneficiary_id UUID;
    v_guarantors_needed INT;
    v_current_guarantors INT;
    v_match RECORD;
    v_matched_count INT := 0;
BEGIN
    -- Get transaction details
    SELECT t.customer_id, t.guarantors_needed
    INTO v_beneficiary_id, v_guarantors_needed
    FROM transactions t
    WHERE t.id = p_transaction_id AND t.status = 'WAITING_MATCH';

    IF v_beneficiary_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Transaction not found or not in waiting status');
    END IF;

    -- Count existing guarantors
    SELECT COUNT(*)
    INTO v_current_guarantors
    FROM transaction_guarantors tg
    WHERE tg.transaction_id = p_transaction_id AND tg.match_status = 'CONFIRMED';

    -- Try to find and link guarantors
    FOR v_match IN
        SELECT * FROM find_potential_guarantors(v_beneficiary_id, p_transaction_id, false)
        LIMIT (v_guarantors_needed - v_current_guarantors)
    LOOP
        INSERT INTO transaction_guarantors (
            transaction_id, guarantor_name, guarantor_national_id,
            workplace_id, match_type, match_status
        )
        VALUES (
            p_transaction_id, v_match.customer_name, v_match.customer_national_id,
            (SELECT workplace_id FROM customers WHERE id = v_match.customer_id),
            'AUTO', 'CONFIRMED'
        );
        v_matched_count := v_matched_count + 1;
    END LOOP;

    -- Update transaction status if fully matched
    IF (v_current_guarantors + v_matched_count) >= v_guarantors_needed THEN
        UPDATE transactions SET status = 'MATCHED' WHERE id = p_transaction_id;
        RETURN json_build_object('success', true, 'matched', v_matched_count, 'status', 'MATCHED');
    ELSE
        RETURN json_build_object(
            'success', true,
            'matched', v_matched_count,
            'status', 'WAITING_MATCH',
            'still_needed', v_guarantors_needed - v_current_guarantors - v_matched_count
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION public.attempt_auto_match IS 'Auto-matches guarantors to a WAITING_MATCH transaction and updates status to MATCHED when fulfilled.';

-- ---- FINANCIAL REQUESTS ----
CREATE TABLE IF NOT EXISTS public.financial_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('LOAN', 'FINANCIAL_VALUE', 'BILLS')),
    amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.financial_requests IS 'Requests for financial advances, values, or bills of exchange submitted by staff to the office manager.';

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

-- Add INSERT policies for banks and branches
CREATE POLICY "Enable insert access for all authenticated users"
    ON public.banks FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable insert access for all authenticated users"
    ON public.branches FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ---- CUSTOMER TRANSFERS ----
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

-- Policies for customer_transfers
CREATE POLICY "Offices can insert transfer requests"
    ON public.customer_transfers FOR INSERT
    TO authenticated
    WITH CHECK (to_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Offices can read own incoming/outgoing transfers"
    ON public.customer_transfers FOR SELECT
    TO authenticated
    USING (
        from_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        OR to_office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    );

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


