/*
  # Set up admin authentication and product management

  1. Changes
    - Add admin user with proper credentials
    - Set up RLS policies for product management
*/

-- Ensure admin user exists with correct credentials
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'admin@matetierra.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = now();

-- Ensure admin user profile exists with admin role
INSERT INTO public.users (
  id,
  email,
  name,
  age,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@matetierra.com',
  'Administrador',
  30,
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = 'admin',
  name = 'Administrador';

-- Drop existing product policies
DROP POLICY IF EXISTS "Enable read access to all" ON products;
DROP POLICY IF EXISTS "Enable insert access to all" ON products;
DROP POLICY IF EXISTS "Enable update access to all" ON products;
DROP POLICY IF EXISTS "Enable delete access to all" ON products;

-- Create new product policies
CREATE POLICY "Anyone can read products"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "Only admins can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can update products"
ON products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete products"
ON products FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);