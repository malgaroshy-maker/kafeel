-- Migration 18: Add callback_date TIMESTAMPTZ column to potential_customers table for CRM calendar callbacks.
ALTER TABLE public.potential_customers ADD COLUMN IF NOT EXISTS callback_date TIMESTAMPTZ;
