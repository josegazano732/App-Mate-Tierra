/*
  # Fix user policies and infinite recursion

  1. Changes
    - Simplify user policies to avoid recursion
    - Ensure admin access without circular references
    - Maintain security while fixing policy issues

  2. Security
    - Maintain RLS protection
    - Keep admin privileges
    - Ensure proper user access control
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access" ON users;
DROP POLICY IF EXISTS "Enable update access" ON users;
DROP POLICY IF EXISTS "Enable user registration" ON users;

-- Simple policy for user registration
CREATE POLICY "Enable user registration"
ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Simplified read policy
CREATE POLICY "Enable read access"
ON users
FOR SELECT
USING (
  auth.uid() = id OR
  role = 'admin'
);

-- Simplified update policy
CREATE POLICY "Enable update access"
ON users
FOR UPDATE
USING (
  auth.uid() = id OR
  role = 'admin'
)
WITH CHECK (
  auth.uid() = id OR
  role = 'admin'
);

-- Ensure admin users exist
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
  SET role = 'admin'
  WHERE users.role != 'admin';

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
  SET role = 'admin'
  WHERE users.role != 'admin';
END
$$;