-- Add rejection_reason to transactions_raw and recreate transactions security barrier view + trigger function

-- 1. Add column to transactions_raw if not exists
ALTER TABLE public.transactions_raw ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
COMMENT ON COLUMN public.transactions_raw.rejection_reason IS 'Reason for document rejection by manager/accountant';

-- 2. Update the transactions view with security barrier
CREATE OR REPLACE VIEW public.transactions WITH (security_barrier) AS
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
    rejection_reason
FROM public.transactions_raw;

-- 3. Update the trigger function to support rejection_reason
CREATE OR REPLACE FUNCTION public.transactions_view_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.transactions_raw (
            id, office_id, customer_id, workplace_id, car_price, bank_ceiling, margin_rate, down_payment, total_installments, office_loan, car_model, purchase_cost, is_files_complete, status, guarantors_needed, verification_status, created_at, rejection_reason
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
            COALESCE(NEW.created_at, now()),
            NEW.rejection_reason
        ) RETURNING 
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
            purchase_cost,
            is_files_complete,
            status,
            guarantors_needed,
            verification_status,
            created_at,
            rejection_reason
        INTO NEW;
        
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
            created_at = NEW.created_at,
            rejection_reason = NEW.rejection_reason
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
