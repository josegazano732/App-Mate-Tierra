/*
  # Fix user registration and profile access policies

  1. Changes
    - Drop existing policies to ensure clean state
    - Create policy for user registration
    - Create policy for reading own profile
    - Ensure proper access control for user data

  2. Security
    - Allow users to create their own profile during registration
    - Restrict profile access to authenticated users
    - Ensure users can only read their own profile data
*/

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Enable user registration" ON users;
DROP POLICY IF EXISTS "Enable read own profile" ON users;

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

-- Create policy for reading own profile
CREATE POLICY "Enable read own profile"
ON users
FOR SELECT
USING (auth.uid() = id);