-- 1. Add column to transactions_raw if not exists
ALTER TABLE public.transactions_raw 
ADD COLUMN IF NOT EXISTS market_sale_price NUMERIC DEFAULT 0;

-- 2. Save existing RLS policies on transaction_guarantors that depend on the view
-- We'll drop them, recreate the view, then recreate them

-- 3. Drop the view CASCADE (will drop dependent policies)
DROP TRIGGER IF EXISTS transactions_view_trigger ON public.transactions;
DROP VIEW IF EXISTS public.transactions CASCADE;

-- 4. Recreate the transactions view with market_sale_price
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
    created_at,
    rejection_reason,
    market_sale_price
FROM public.transactions_raw;

-- 5. Update the trigger function to support market_sale_price
CREATE OR REPLACE FUNCTION public.transactions_view_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.id := COALESCE(NEW.id, gen_random_uuid());
        NEW.car_price := COALESCE(NEW.car_price, 0);
        NEW.bank_ceiling := COALESCE(NEW.bank_ceiling, 0);
        NEW.margin_rate := COALESCE(NEW.margin_rate, 0);
        NEW.down_payment := COALESCE(NEW.down_payment, 0);
        NEW.total_installments := COALESCE(NEW.total_installments, 0);
        NEW.is_files_complete := COALESCE(NEW.is_files_complete, false);
        NEW.status := COALESCE(NEW.status, 'PENDING');
        NEW.guarantors_needed := COALESCE(NEW.guarantors_needed, 1);
        NEW.verification_status := COALESCE(NEW.verification_status, 'pending');
        NEW.created_at := COALESCE(NEW.created_at, now());

        INSERT INTO public.transactions_raw (
            id, office_id, customer_id, workplace_id, car_price, bank_ceiling, margin_rate, down_payment, total_installments, office_loan, car_model, purchase_cost, is_files_complete, status, guarantors_needed, verification_status, created_at, rejection_reason, market_sale_price
        ) VALUES (
            NEW.id,
            NEW.office_id,
            NEW.customer_id,
            NEW.workplace_id,
            NEW.car_price,
            NEW.bank_ceiling,
            NEW.margin_rate,
            NEW.down_payment,
            NEW.total_installments,
            NEW.office_loan,
            NEW.car_model,
            NEW.purchase_cost,
            NEW.is_files_complete,
            NEW.status,
            NEW.guarantors_needed,
            NEW.verification_status,
            NEW.created_at,
            NEW.rejection_reason,
            COALESCE(NEW.market_sale_price, 0)
        );
        
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
                ELSE transactions_raw.purchase_cost
            END,
            is_files_complete = COALESCE(NEW.is_files_complete, false),
            status = COALESCE(NEW.status, 'PENDING'),
            guarantors_needed = COALESCE(NEW.guarantors_needed, 1),
            verification_status = COALESCE(NEW.verification_status, 'pending'),
            created_at = NEW.created_at,
            rejection_reason = NEW.rejection_reason,
            market_sale_price = COALESCE(NEW.market_sale_price, 0)
        WHERE id = OLD.id;
        
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

-- 6. Recreate the INSTEAD OF trigger on the new view
CREATE TRIGGER transactions_view_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.transactions_view_trigger_func();

-- 7. Re-apply RLS policies on transaction_guarantors that referenced the transactions view
DROP POLICY IF EXISTS "Offices can SELECT own guarantors" ON public.transaction_guarantors;
CREATE POLICY "Offices can SELECT own guarantors" ON public.transaction_guarantors
    FOR SELECT USING (
        transaction_id IN (SELECT id FROM public.transactions WHERE office_id = (
            SELECT office_id FROM public.user_profiles WHERE id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Offices can INSERT own guarantors" ON public.transaction_guarantors;
CREATE POLICY "Offices can INSERT own guarantors" ON public.transaction_guarantors
    FOR INSERT WITH CHECK (
        transaction_id IN (SELECT id FROM public.transactions WHERE office_id = (
            SELECT office_id FROM public.user_profiles WHERE id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Offices can UPDATE own guarantors" ON public.transaction_guarantors;
CREATE POLICY "Offices can UPDATE own guarantors" ON public.transaction_guarantors
    FOR UPDATE USING (
        transaction_id IN (SELECT id FROM public.transactions WHERE office_id = (
            SELECT office_id FROM public.user_profiles WHERE id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Only managers can DELETE own guarantors" ON public.transaction_guarantors;
CREATE POLICY "Only managers can DELETE own guarantors" ON public.transaction_guarantors
    FOR DELETE USING (
        transaction_id IN (SELECT id FROM public.transactions WHERE office_id = (
            SELECT office_id FROM public.user_profiles WHERE id = auth.uid()
        ))
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager')
    );
