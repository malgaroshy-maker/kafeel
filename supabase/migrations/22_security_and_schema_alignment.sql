-- ============================================================================
-- Migration: 22_security_and_schema_alignment.sql
-- Goal: Secure offices SELECT policy, align market_sale_price and settlements columns
-- Last updated: 2026-05-25
-- ============================================================================

-- 1. Tighten security on public.offices SELECT policy to prevent join_code leaks
DROP POLICY IF EXISTS "Public read offices" ON public.offices;

CREATE POLICY "Offices can SELECT own details"
    ON public.offices FOR SELECT
    TO authenticated
    USING (
        id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid)
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'monitor')
    );

-- 2. Add market_sale_price to base table public.transactions_raw
ALTER TABLE public.transactions_raw 
ADD COLUMN IF NOT EXISTS market_sale_price NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.transactions_raw.market_sale_price IS 'Dealer market sale price of the vehicle for office manager records.';

-- 3. Re-create transactions view to expose market_sale_price with proper masking
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
    CASE
        WHEN (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'accountant') THEN market_sale_price
        ELSE 0
    END AS market_sale_price,
    is_files_complete,
    status,
    guarantors_needed,
    verification_status,
    rejection_reason,
    has_notary_pledge,
    created_at
FROM public.transactions_raw;

-- 4. Re-create view trigger function to support market_sale_price writes
CREATE OR REPLACE FUNCTION public.transactions_view_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.transactions_raw (
            id, office_id, customer_id, workplace_id, car_price, bank_ceiling, margin_rate, down_payment, total_installments, office_loan, car_model, purchase_cost, market_sale_price, is_files_complete, status, guarantors_needed, verification_status, rejection_reason, has_notary_pledge, created_at
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
            COALESCE(NEW.market_sale_price, 0),
            COALESCE(NEW.is_files_complete, false),
            COALESCE(NEW.status, 'PENDING'),
            COALESCE(NEW.guarantors_needed, 1),
            COALESCE(NEW.verification_status, 'pending'),
            NEW.rejection_reason,
            COALESCE(NEW.has_notary_pledge, false),
            COALESCE(NEW.created_at, now())
        ) RETURNING * INTO NEW;
        
        -- Mask sensitive fields on return
        IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('admin', 'manager', 'accountant') THEN
            NEW.purchase_cost := NULL;
            NEW.market_sale_price := 0;
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
                ELSE transactions_raw.purchase_cost
            END,
            market_sale_price = CASE
                WHEN (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'accountant') THEN NEW.market_sale_price
                ELSE transactions_raw.market_sale_price
            END,
            is_files_complete = COALESCE(NEW.is_files_complete, false),
            status = COALESCE(NEW.status, 'PENDING'),
            guarantors_needed = COALESCE(NEW.guarantors_needed, 1),
            verification_status = COALESCE(NEW.verification_status, 'pending'),
            rejection_reason = NEW.rejection_reason,
            has_notary_pledge = COALESCE(NEW.has_notary_pledge, false),
            created_at = NEW.created_at
        WHERE id = OLD.id;
        
        -- Mask sensitive fields on return
        IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('admin', 'manager', 'accountant') THEN
            NEW.purchase_cost := NULL;
            NEW.market_sale_price := 0;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.transactions_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Re-assign INSTEAD OF trigger to view
CREATE TRIGGER transactions_view_trigger
    INSTEAD OF INSERT OR UPDATE OR DELETE
    ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.transactions_view_trigger_func();

-- 5. Add missing advanced accounting columns to settlements table
ALTER TABLE public.settlements 
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS promissory_notes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS promissory_notes_details TEXT;

COMMENT ON COLUMN public.settlements.shipping_cost IS 'Physical shipping and freight logistics costs incurred for the vehicle.';
COMMENT ON COLUMN public.settlements.staff_commission IS 'Individual sales commission fee rewarded to the data entry agent.';
COMMENT ON COLUMN public.settlements.promissory_notes_count IS 'Count of legal wagers/promissory notes signed by beneficiary.';
COMMENT ON COLUMN public.settlements.promissory_notes_details IS 'Detailed note on promissory note codes and payment deadlines.';
