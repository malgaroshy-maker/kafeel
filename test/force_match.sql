-- 1. For Ali's transaction (5fee98ba-4acb-43ec-b03d-a3e8bea54500), set guarantors_needed to 1 and add Fathi as guarantor
UPDATE public.transactions_raw 
SET guarantors_needed = 1, status = 'MATCHED'
WHERE id = '5fee98ba-4acb-43ec-b03d-a3e8bea54500';

DELETE FROM public.transaction_guarantors WHERE transaction_id = '5fee98ba-4acb-43ec-b03d-a3e8bea54500';

INSERT INTO public.transaction_guarantors (
    transaction_id, guarantor_name, guarantor_national_id, workplace_id, match_type, match_status
) VALUES (
    '5fee98ba-4acb-43ec-b03d-a3e8bea54500',
    'فتحي ',
    '119976465745',
    'c9731ee5-c05f-4439-8d58-c55b76c391a6',
    'MANUAL',
    'CONFIRMED'
);

-- 2. For Fathi's transaction (dadc51e7-4d39-48a9-aba7-09476ab3341e), set guarantors_needed to 1 and add Ali as guarantor
UPDATE public.transactions_raw 
SET guarantors_needed = 1, status = 'MATCHED'
WHERE id = 'dadc51e7-4d39-48a9-aba7-09476ab3341e';

DELETE FROM public.transaction_guarantors WHERE transaction_id = 'dadc51e7-4d39-48a9-aba7-09476ab3341e';

INSERT INTO public.transaction_guarantors (
    transaction_id, guarantor_name, guarantor_national_id, workplace_id, match_type, match_status
) VALUES (
    'dadc51e7-4d39-48a9-aba7-09476ab3341e',
    'علي محمد',
    '120036223265',
    'ce95b3fa-50da-48c4-abf7-ad9d666ada70',
    'MANUAL',
    'CONFIRMED'
);
