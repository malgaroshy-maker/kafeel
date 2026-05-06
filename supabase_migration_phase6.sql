-- 1. Add purchase_cost to transactions
ALTER TABLE public.transactions
ADD COLUMN purchase_cost numeric;

COMMENT ON COLUMN public.transactions.purchase_cost IS 'The actual cost of the car for the office. Hidden from staff/monitors.';

-- 2. Add check_image_url to settlements
ALTER TABLE public.settlements
ADD COLUMN check_image_url text;

COMMENT ON COLUMN public.settlements.check_image_url IS 'Path to the uploaded check or guarantee image in Supabase Storage.';

-- 3. Update transactions View or RLS (If necessary, to hide purchase_cost from Staff)
-- Note: RLS policies should ensure that only the Super Admin or Office Manager can read/write the purchase_cost column.
