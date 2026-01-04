-- Drop existing policies for logos bucket
DROP POLICY IF EXISTS "Enable public read access for logos" ON storage.objects;
DROP POLICY IF EXISTS "Enable admin upload access for logos" ON storage.objects;
DROP POLICY IF EXISTS "Enable admin update access for logos" ON storage.objects;
DROP POLICY IF EXISTS "Enable admin delete access for logos" ON storage.objects;

-- Ensure logos bucket exists with public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Create simplified policies for logos bucket
CREATE POLICY "Public read access for logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Admin access for logos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;