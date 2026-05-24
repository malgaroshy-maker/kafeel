-- Kafeel E2E Matchmaking & Waiting Queue Verification SQL Script
-- Tests cross-office linking between "البركة" and "الحرية" offices.

BEGIN;

-- 1. CLEANUP PREVIOUS TEST RECORDS (if any)
DELETE FROM public.transaction_guarantors WHERE guarantor_national_id IN ('120061234567', '119971234567');
DELETE FROM public.settlements WHERE id = 'c3333333-3333-3333-3333-333333333333';
DELETE FROM public.transactions_raw WHERE id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';
DELETE FROM public.customers WHERE national_id IN ('120061234567', '119971234567');

-- 2. INSERT TEST CUSTOMERS
-- Beneficiary (Ali) under Al-Baraka Office (id: cda6dd37-a0cf-4c92-93be-6e165c5da793)
INSERT INTO public.customers (
    id, office_id, national_id, name, phone, salary, workplace_id, gender, birth_year, bank_id, branch_id, account_number
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'cda6dd37-a0cf-4c92-93be-6e165c5da793',
    '120061234567',
    'E2E_Test_Ali',
    '0911234567',
    2500.00,
    'a373a5eb-f615-4aac-ac64-1b6c8a7a1b2c', -- وزارة المالية
    'male',
    2000,
    '8876489c-02bc-499e-baf0-6cc12c93d3c9',
    '50643bd1-6f65-4a37-94b8-c9c2f0df1c00',
    '123456789012'
);

-- Guarantor (Fathi) under Al-Hurriya Office (id: e7b41e52-f63c-4f95-aa2e-ccb889d54a83)
INSERT INTO public.customers (
    id, office_id, national_id, name, phone, salary, workplace_id, gender, birth_year, bank_id, branch_id, account_number
) VALUES (
    'f2222222-2222-2222-2222-222222222222',
    'e7b41e52-f63c-4f95-aa2e-ccb889d54a83',
    '119971234567',
    'E2E_Test_Fathi',
    '0917654321',
    2480.00, -- Salary difference is 20 LYD (<= 50 LYD limit)
    'a373a5eb-f615-4aac-ac64-1b6c8a7a1b2c', -- وزارة المالية (Same workplace)
    'male',
    1997,
    '8876489c-02bc-499e-baf0-6cc12c93d3c9',
    '50643bd1-6f65-4a37-94b8-c9c2f0df1c00',
    '098765432109'
);

-- 3. CREATE WAITING_MATCH TRANSACTION FOR BENEFIARY (Ali)
INSERT INTO public.transactions_raw (
    id, office_id, customer_id, status, guarantors_needed, car_model, car_price, 
    down_payment, bank_ceiling, margin_rate, total_installments, office_loan, 
    purchase_cost, is_files_complete, workplace_id, verification_status
) VALUES (
    'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
    'cda6dd37-a0cf-4c92-93be-6e165c5da793', -- Al-Baraka
    'a1111111-1111-1111-1111-111111111111', -- Ali
    'WAITING_MATCH',
    1,
    'Starlet',
    95000.00,
    0.00,
    120000.00,
    0.16,
    96,
    0.00,
    90000.00,
    true,
    'a373a5eb-f615-4aac-ac64-1b6c8a7a1b2c',
    'verified'
);

-- 4. VERIFY CUSTOMER IN WAITING QUEUE
SELECT 'VERIFY IN QUEUE' AS step, id, customer_id, status, guarantors_needed FROM public.transactions WHERE id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';

-- 5. TRIGGER MATCHMAKING ENGINE via attempt_auto_match RPC
SELECT 'RUN MATCHMAKING' AS step, public.attempt_auto_match('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2') AS rpc_result;

-- 6. VERIFY MATCH IS CONFIRMED AND LINKED
SELECT 'VERIFY MATCHED' AS step, tg.transaction_id, tg.guarantor_name, tg.guarantor_national_id, tg.match_type, tg.match_status 
FROM public.transaction_guarantors tg 
WHERE tg.transaction_id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';

SELECT 'VERIFY TX STATUS' AS step, t.id, t.customer_id, t.status FROM public.transactions t WHERE t.id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';

-- 7. PROGRESS TO ACTIVE STAGE (Simulate Document Approval)
UPDATE public.transactions_raw SET status = 'ACTIVE', verification_status = 'verified' WHERE id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';
SELECT 'VERIFY ACTIVE' AS step, t.id, t.status, t.verification_status FROM public.transactions t WHERE t.id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';

-- 8. CREATE POST-DELIVERY SETTLEMENT (Simulate Cash-out Settlement)
INSERT INTO public.settlements (
    id, office_id, transaction_id, settlement_type, down_payment_collected, debt_amount, net_cash, status, check_image_url
) VALUES (
    'c3333333-3333-3333-3333-333333333333',
    'cda6dd37-a0cf-4c92-93be-6e165c5da793', -- Al-Baraka
    'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
    'CASH_OUT',
    0.00,
    95000.00,
    80000.00,
    'COMPLETED',
    'https://storage.supabase.com/settlement-checks/check_e2e.png'
);

-- 9. COMPLETE THE TRANSACTION
UPDATE public.transactions_raw SET status = 'COMPLETED' WHERE id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';
SELECT 'VERIFY COMPLETED' AS step, t.id, t.status FROM public.transactions t WHERE t.id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';

-- 10. GENERATE CONSOLIDATED STATEMENT
SELECT 'CONSOLIDATED STATEMENT' AS step, s.settlement_type, s.down_payment_collected, s.debt_amount, s.net_cash, s.status, s.check_image_url 
FROM public.settlements s 
WHERE s.transaction_id = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';

COMMIT;
