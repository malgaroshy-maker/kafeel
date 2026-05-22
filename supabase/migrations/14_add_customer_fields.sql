-- Migration: Add customer bank account number and private phone number, and make national ID optional.
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_private TEXT;
ALTER TABLE public.customers ALTER COLUMN national_id DROP NOT NULL;
