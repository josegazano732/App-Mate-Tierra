/*
  # Fix users table policies

  1. Changes
    - Drop existing policies that may cause recursion
    - Create simplified policies that avoid recursion
    - Maintain security while allowing proper access
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access" ON users;
DROP POLICY IF EXISTS "Enable update access" ON users;
DROP POLICY IF EXISTS "Enable user registration" ON users;

-- Create simplified read policy
CREATE POLICY "Enable read access"
ON users
FOR SELECT
USING (
  -- Users can read their own profile
  auth.uid() = id OR
  -- Admins can read all profiles
  role = 'admin'
);

-- Create simplified update policy
CREATE POLICY "Enable update access"
ON users
FOR UPDATE
USING (
  -- Users can update their own profile
  auth.uid() = id OR
  -- Admins can update all profiles
  role = 'admin'
);

-- Create simplified insert policy
CREATE POLICY "Enable user registration"
ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;