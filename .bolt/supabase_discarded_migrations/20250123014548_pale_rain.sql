/*
  # Fix user registration policy

  1. Changes
    - Drop existing policies
    - Create new policy for user registration
    - Add policy for reading own profile
    - Ensure proper access control

  2. Security
    - Allow users to create their own profile during registration
    - Allow users to read their own profile data
*/

-- Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Create policy for user registration
CREATE POLICY "Enable user registration"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policy for reading own profile
CREATE POLICY "Enable read own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);