-- Drop existing RLS policies for products
DROP POLICY IF EXISTS "Anyone can read products" ON products;
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
DROP POLICY IF EXISTS "Only admins can update products" ON products;
DROP POLICY IF EXISTS "Only admins can delete products" ON products;

-- Create new public access policies for products
CREATE POLICY "Enable read access to all"
ON products FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Enable insert access to all"
ON products FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access to all"
ON products FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Enable delete access to all"
ON products FOR DELETE
TO anon, authenticated
USING (true);