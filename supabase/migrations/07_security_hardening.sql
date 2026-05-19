-- ============================================================================
-- Migration: 07_security_hardening.sql
-- Goal: Column masking, Anti-tampering, and Runtime logging
-- Last updated: 2026-05-19
-- ============================================================================

-- 1. Create System Runtime Errors Table
CREATE TABLE IF NOT EXISTS public.system_runtime_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_name TEXT,
    severity TEXT DEFAULT 'ERROR',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on system_runtime_errors
ALTER TABLE public.system_runtime_errors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT errors (for reporting)
CREATE POLICY "Allow authenticated users to insert system errors"
    ON public.system_runtime_errors FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow admins and managers to SELECT errors
CREATE POLICY "Allow managers and admins to read system errors"
    ON public.system_runtime_errors FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'accountant')
    );

-- 2. Create Auth Failures Table (to track potential brute force / scans)
CREATE TABLE IF NOT EXISTS public.auth_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on auth_failures
ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for login auditing
CREATE POLICY "Allow anonymous insert for auth failures"
    ON public.auth_failures FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow admins/managers to read auth failures
CREATE POLICY "Admins and managers can read auth failures"
    ON public.auth_failures FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager')
    );

-- 3. Dynamic Column Masking for purchase_cost
-- Rename transactions table to transactions_raw
ALTER TABLE public.transactions RENAME TO transactions_raw;

-- Create updatable VIEW transactions with security barrier
-- Drop view cascadingly to allow column changes and avoid type mismatch errors
DROP VIEW IF EXISTS public.transactions CASCADE;

CREATE VIEW public.transactions WITH (security_barrier) AS
SELECT
    id,
    office_id,
    customer_id,
    workplace_id,
    car_price,
    bank_ceiling,
    margin_rate,
    down_payment,
    total_installments,
    office_loan,
    car_model,
    CASE
        WHEN (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'accountant') THEN purchase_cost
        ELSE NULL
    END AS purchase_cost,
    is_files_complete,
    status,
    guarantors_needed,
    verification_status,
    created_at
FROM public.transactions_raw;

-- Create INSTEAD OF triggers for transactions view to ensure complete transparency
CREATE OR REPLACE FUNCTION public.transactions_view_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.transactions_raw (
            id, office_id, customer_id, workplace_id, car_price, bank_ceiling, margin_rate, down_payment, total_installments, office_loan, car_model, purchase_cost, is_files_complete, status, guarantors_needed, verification_status, created_at
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.office_id,
            NEW.customer_id,
            NEW.workplace_id,
            COALESCE(NEW.car_price, 0),
            COALESCE(NEW.bank_ceiling, 0),
            COALESCE(NEW.margin_rate, 0),
            COALESCE(NEW.down_payment, 0),
            COALESCE(NEW.total_installments, 0),
            NEW.office_loan,
            NEW.car_model,
            NEW.purchase_cost,
            COALESCE(NEW.is_files_complete, false),
            COALESCE(NEW.status, 'PENDING'),
            COALESCE(NEW.guarantors_needed, 1),
            COALESCE(NEW.verification_status, 'pending'),
            COALESCE(NEW.created_at, now())
        ) RETURNING * INTO NEW;
        
        -- Make sure we dynamically evaluate purchase_cost visibility for return
        IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('admin', 'manager', 'accountant') THEN
            NEW.purchase_cost := NULL;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.transactions_raw SET
            office_id = NEW.office_id,
            customer_id = NEW.customer_id,
            workplace_id = NEW.workplace_id,
            car_price = COALESCE(NEW.car_price, 0),
            bank_ceiling = COALESCE(NEW.bank_ceiling, 0),
            margin_rate = COALESCE(NEW.margin_rate, 0),
            down_payment = COALESCE(NEW.down_payment, 0),
            total_installments = COALESCE(NEW.total_installments, 0),
            office_loan = NEW.office_loan,
            car_model = NEW.car_model,
            purchase_cost = CASE
                WHEN (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'accountant') THEN NEW.purchase_cost
                ELSE transactions_raw.purchase_cost -- Keep old value for staff
            END,
            is_files_complete = COALESCE(NEW.is_files_complete, false),
            status = COALESCE(NEW.status, 'PENDING'),
            guarantors_needed = COALESCE(NEW.guarantors_needed, 1),
            verification_status = COALESCE(NEW.verification_status, 'pending'),
            created_at = NEW.created_at
        WHERE id = OLD.id;
        
        -- Mask return value if needed
        IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('admin', 'manager', 'accountant') THEN
            NEW.purchase_cost := NULL;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.transactions_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER transactions_view_trigger
    INSTEAD OF INSERT OR UPDATE OR DELETE
    ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.transactions_view_trigger_func();

-- 4. Anti-Tampering Financial Validation Trigger
CREATE OR REPLACE FUNCTION public.check_transaction_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_murabaha NUMERIC;
    v_max_bank_capacity NUMERIC;
    v_expected_bank_repayment NUMERIC;
    v_expected_down_payment NUMERIC;
    v_customer_salary NUMERIC;
    v_deduction_rate NUMERIC := 0.50; -- Standard 50% deduction rate
    v_term_months INT := 96; -- 8 years (96 installments)
    v_bank_ceiling NUMERIC := 120000; -- Ideal Max Bank Murabaha Ceiling
BEGIN
    -- Only validate if status is not default empty or PENDING
    IF NEW.car_price = 0 OR NEW.status = 'PENDING' THEN
        RETURN NEW;
    END IF;

    -- Enforce maximum institutional Murabaha bank ceiling
    IF NEW.bank_ceiling > v_bank_ceiling THEN
        RAISE EXCEPTION 'سقف تمويل كفيل المصرفي الأقصى هو 120,000 د.ل ولا يمكن تجاوزه';
    END IF;

    -- Fetch customer salary to verify dynamic calculation
    SELECT salary INTO v_customer_salary
    FROM public.customers
    WHERE id = NEW.customer_id;

    IF v_customer_salary IS NULL THEN
        RAISE EXCEPTION 'لم يتم إيجاد ملف الراتب الخاص بالزبون لإتمام التحقق المالي';
    END IF;

    -- Re-calculate exact mathematical model to match financialEngine.ts
    v_total_murabaha := NEW.car_price * (1 + NEW.margin_rate);
    v_max_bank_capacity := LEAST(v_bank_ceiling, v_customer_salary * v_deduction_rate * v_term_months);
    v_expected_bank_repayment := LEAST(v_total_murabaha, v_max_bank_capacity);
    v_expected_down_payment := v_total_murabaha - v_expected_bank_repayment;

    -- Verify that down payment submitted is within 5 LYD buffer (to allow for float/decimal rounding)
    IF ABS(NEW.down_payment - v_expected_down_payment) > 5.0 THEN
        RAISE EXCEPTION 'تلاعب بالقيم المالية مكشوف! القيمة المتوقعة للدفعة الأولى هي % د.ل، وتم تقديم % د.ل',
            v_expected_down_payment, NEW.down_payment;
    END IF;

    RETURN NEW;
END;
$$;

-- Apply Anti-Tamper Trigger on transactions_raw
CREATE TRIGGER prevent_financial_tampering
    BEFORE INSERT OR UPDATE OF car_price, bank_ceiling, margin_rate, down_payment, customer_id
    ON public.transactions_raw
    FOR EACH ROW
    EXECUTE FUNCTION public.check_transaction_financials();

-- Re-point and secure guarantor queries to direct table references
DROP POLICY IF EXISTS "Offices can SELECT own guarantors" ON public.transaction_guarantors;
DROP POLICY IF EXISTS "Offices can INSERT own guarantors" ON public.transaction_guarantors;
DROP POLICY IF EXISTS "Offices can UPDATE own guarantors" ON public.transaction_guarantors;
DROP POLICY IF EXISTS "Only managers can DELETE own guarantors" ON public.transaction_guarantors;

CREATE POLICY "Offices can SELECT own guarantors"
    ON public.transaction_guarantors FOR SELECT
    TO public
    USING (transaction_id IN (
        SELECT id FROM public.transactions_raw
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ));

CREATE POLICY "Offices can INSERT own guarantors"
    ON public.transaction_guarantors FOR INSERT
    TO public
    WITH CHECK (transaction_id IN (
        SELECT id FROM public.transactions_raw
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ));

CREATE POLICY "Offices can UPDATE own guarantors"
    ON public.transaction_guarantors FOR UPDATE
    TO public
    USING (transaction_id IN (
        SELECT id FROM public.transactions_raw
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ))
    WITH CHECK (transaction_id IN (
        SELECT id FROM public.transactions_raw
        WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
    ));

CREATE POLICY "Only managers can DELETE own guarantors"
    ON public.transaction_guarantors FOR DELETE
    TO public
    USING (
        transaction_id IN (
            SELECT id FROM public.transactions_raw
            WHERE office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        )
        AND ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
    );
