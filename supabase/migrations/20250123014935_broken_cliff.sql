/*
  # Fix admin access and policies

  1. Changes
    - Drop existing user policies to ensure clean state
    - Create comprehensive user access policies
    - Add policy for admin access
    - Create initial admin user

  2. Security
    - Enable proper admin role access
    - Maintain user data protection
    - Ensure admin can manage all records
*/

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Enable read own profile" ON users;
DROP POLICY IF EXISTS "Enable user registration" ON users;

-- Create policy for user registration
CREATE POLICY "Enable user registration"
ON users
FOR INSERT
WITH CHECK (
  auth.uid() = id AND
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = users.id
  )
);

-- Create policy for reading profiles
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

-- Create policy for updating profiles
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

-- Insert admin user if not exists
DO $$
BEGIN
  INSERT INTO users (id, email, name, age, role)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    'Admin User',
    30,
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;
END
$$;