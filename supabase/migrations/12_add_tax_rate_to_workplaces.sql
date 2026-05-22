-- Add tax_rate column to workplaces table
-- Represents payroll deduction rate: 16% or 24%
ALTER TABLE workplaces
  ADD COLUMN IF NOT EXISTS tax_rate smallint CHECK (tax_rate IN (16, 24));

COMMENT ON COLUMN workplaces.tax_rate IS 'نسبة الاستقطاع الضريبي للجهة: 16 أو 24 بالمئة';
