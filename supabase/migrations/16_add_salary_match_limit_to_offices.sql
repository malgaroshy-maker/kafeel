-- Add salary_match_limit column to public.offices
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS salary_match_limit NUMERIC DEFAULT 50 CHECK (salary_match_limit >= 0 AND salary_match_limit <= 50);

-- Update comments
COMMENT ON COLUMN public.offices.salary_match_limit IS 'Maximum salary difference allowed for automatic or validation matching between beneficiary and guarantor.';

-- Re-create public.find_potential_guarantors function to respect office settings
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
    v_office_id UUID;
    v_match_limit NUMERIC;
BEGIN
    -- Get beneficiary's workplace and salary
    SELECT c.workplace_id, c.salary, c.office_id
    INTO v_workplace_id, v_salary, v_office_id
    FROM customers c
    WHERE c.id = p_beneficiary_id;

    IF v_workplace_id IS NULL OR v_salary IS NULL THEN
        RAISE EXCEPTION 'Beneficiary workplace or salary not set';
    END IF;

    -- Get match limit from office settings, default to 50
    SELECT COALESCE(o.salary_match_limit, 50)
    INTO v_match_limit
    FROM offices o
    WHERE o.id = v_office_id;

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
      -- Salary diff <= v_match_limit LYD (skip if override)
      AND (p_override_validation OR ABS(c.salary - v_salary) <= v_match_limit)
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
