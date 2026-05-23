-- Alter settlements table to add the new premium fields natively to the remote database
ALTER TABLE public.settlements 
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS promissory_notes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS promissory_notes_details TEXT;
