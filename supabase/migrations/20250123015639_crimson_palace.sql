/*
  # Fix admin user authentication

  1. Changes
    - Ensure admin user exists with proper credentials
    - Add comprehensive admin access policies
    - Update existing admin users with correct role

  2. Security
    - Maintain existing security policies
    - Add specific admin role permissions
*/

-- Drop existing admin-related policies to ensure clean state
DROP POLICY IF EXISTS "Enable read access" ON users;
DROP POLICY IF EXISTS "Enable update access" ON users;

-- Create comprehensive read policy
CREATE POLICY "Enable read access"
ON users
FOR SELECT
USING (
  -- Allow users to read their own profile
  auth.uid() = id
  OR
  -- Allow admins to read all profiles
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create comprehensive update policy
CREATE POLICY "Enable update access"
ON users
FOR UPDATE
USING (
  -- Allow users to update their own profile
  auth.uid() = id
  OR
  -- Allow admins to update all profiles
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  -- Same conditions as USING clause
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Ensure admin users exist and have correct role
DO $$
BEGIN
  -- First admin user
  INSERT INTO users (id, email, name, age, role)
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
    name = EXCLUDED.name,
    role = 'admin';

  -- Second admin user
  INSERT INTO users (id, email, name, age, role)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'admin@example.com',
    'Admin User',
    30,
    'admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = 'admin';

  -- Update any existing admin users to ensure role is correct
  UPDATE users 
  SET role = 'admin'
  WHERE email IN ('admin@matetierra.com', 'admin@example.com');
END
$$;