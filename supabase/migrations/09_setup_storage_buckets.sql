-- Create transaction-docs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('transaction-docs', 'transaction-docs', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create settlement-checks bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('settlement-checks', 'settlement-checks', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they conflict to avoid duplicates
DROP POLICY IF EXISTS "Public Read Access for transaction-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert for transaction-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update/Delete for transaction-docs" ON storage.objects;

DROP POLICY IF EXISTS "Public Read Access for settlement-checks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert for settlement-checks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update/Delete for settlement-checks" ON storage.objects;

-- Create storage policies for transaction-docs
CREATE POLICY "Public Read Access for transaction-docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'transaction-docs');

CREATE POLICY "Authenticated Insert for transaction-docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'transaction-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Update/Delete for transaction-docs" ON storage.objects
  FOR ALL USING (bucket_id = 'transaction-docs' AND auth.role() = 'authenticated');

-- Create storage policies for settlement-checks
CREATE POLICY "Public Read Access for settlement-checks" ON storage.objects
  FOR SELECT USING (bucket_id = 'settlement-checks');

CREATE POLICY "Authenticated Insert for settlement-checks" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'settlement-checks' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Update/Delete for settlement-checks" ON storage.objects
  FOR ALL USING (bucket_id = 'settlement-checks' AND auth.role() = 'authenticated');
