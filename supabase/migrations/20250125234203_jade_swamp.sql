/*
  # Fix product table policies

  1. Changes
    - Drop existing policies
    - Create new policies that allow public access for reading products
    - Maintain admin-only access for modifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access to all" ON products;
DROP POLICY IF EXISTS "Enable insert access to all" ON products;
DROP POLICY IF EXISTS "Enable update access to all" ON products;
DROP POLICY IF EXISTS "Enable delete access to all" ON products;

-- Create new policies
CREATE POLICY "Allow public read access"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow admin insert"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Allow admin update"
ON products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Allow admin delete"
ON products FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;