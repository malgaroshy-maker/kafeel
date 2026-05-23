CREATE OR REPLACE FUNCTION public.transactions_view_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 1. Explicitly assign default values to NEW to ensure complete view representation
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

        -- 2. Insert into public.transactions_raw directly
        INSERT INTO public.transactions_raw (
            id, office_id, customer_id, workplace_id, car_price, bank_ceiling, margin_rate, down_payment, total_installments, office_loan, car_model, purchase_cost, is_files_complete, status, guarantors_needed, verification_status, created_at, rejection_reason
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
            NEW.rejection_reason
        );
        
        -- 3. Mask return value if needed
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
