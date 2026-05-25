-- ============================================================================
-- Migration: 21_dynamic_pledges_and_codes.sql
-- Goal: Dynamic Notary Pledge column & trigger checking, 8-character join codes
-- Last updated: 2026-05-25
-- ============================================================================

-- 1. Add has_notary_pledge to base table public.transactions_raw
ALTER TABLE public.transactions_raw 
ADD COLUMN IF NOT EXISTS has_notary_pledge BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.transactions_raw.has_notary_pledge IS 'True if the user has signed a Notary Pledge (تعهد محرر عقود), increasing deduction limit to 50%';

-- 2. Re-create the transactions security barrier view to expose has_notary_pledge
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
    rejection_reason,
    has_notary_pledge,
    created_at
FROM public.transactions_raw;

-- 3. Re-create instead of view trigger function to handle has_notary_pledge
CREATE OR REPLACE FUNCTION public.transactions_view_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.transactions_raw (
            id, office_id, customer_id, workplace_id, car_price, bank_ceiling, margin_rate, down_payment, total_installments, office_loan, car_model, purchase_cost, is_files_complete, status, guarantors_needed, verification_status, rejection_reason, has_notary_pledge, created_at
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
            NEW.rejection_reason,
            COALESCE(NEW.has_notary_pledge, false),
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
            rejection_reason = NEW.rejection_reason,
            has_notary_pledge = COALESCE(NEW.has_notary_pledge, false),
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

-- Re-assign transactions view INSTEAD OF trigger
CREATE TRIGGER transactions_view_trigger
    INSTEAD OF INSERT OR UPDATE OR DELETE
    ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.transactions_view_trigger_func();

-- 4. Update check_transaction_financials trigger function to use dynamic has_notary_pledge checking
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
    v_deduction_rate NUMERIC; -- Dynamically resolved
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

    -- Resolve dynamic deduction rate based on notary pledge flag
    IF NEW.has_notary_pledge = true THEN
        v_deduction_rate := 0.50; -- Notary pledge increases cap to 50%
    ELSE
        v_deduction_rate := 0.35; -- Standard limit is 35%
    END IF;

    -- Re-calculate exact mathematical model to match financialEngine.ts
    v_total_murabaha := NEW.car_price * (1 + NEW.margin_rate);
    v_max_bank_capacity := LEAST(v_bank_ceiling, v_customer_salary * v_deduction_rate * v_term_months);
    v_expected_bank_repayment := LEAST(v_total_murabaha, v_max_bank_capacity);
    v_expected_down_payment := v_total_murabaha - v_expected_bank_repayment;

    -- Handle downpayment rounding up to the nearest 50 LYD as implemented in financialEngine.ts
    v_expected_down_payment := CEIL(v_expected_down_payment / 50.0) * 50.0;
    v_expected_down_payment := LEAST(v_total_murabaha, v_expected_down_payment);

    -- Verify that down payment submitted is within 5 LYD buffer (to allow for float/decimal rounding)
    IF ABS(NEW.down_payment - v_expected_down_payment) > 5.0 THEN
        RAISE EXCEPTION 'تلاعب بالقيم المالية مكشوف! القيمة المتوقعة للدفعة الأولى هي % د.ل، وتم تقديم % د.ل',
            v_expected_down_payment, NEW.down_payment;
    END IF;

    RETURN NEW;
END;
$$;

-- 5. Harden generate_join_code() to generate 8-character codes (higher entropy)
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := upper(substr(md5(random()::text || now()::text), 1, 8));
        SELECT EXISTS(SELECT 1 FROM public.offices WHERE join_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

COMMENT ON FUNCTION public.generate_join_code IS 'Generates a unique 8-character alphanumeric join code for offices to prevent brute-force guessing.';
