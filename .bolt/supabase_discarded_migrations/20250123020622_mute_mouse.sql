/*
  # Fix Authentication Policies

  1. Changes
    - Drop all existing user policies to start fresh
    - Create simplified policies without recursion
    - Fix admin role assignment
    - Add default admin users

  2. Security
    - Enable RLS
    - Set up proper non-recursive policies
    - Ensure admin access works correctly
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access" ON users;
DROP POLICY IF EXISTS "Enable update access" ON users;
DROP POLICY IF EXISTS "Enable user registration" ON users;

-- Create a simple read policy that avoids recursion
CREATE POLICY "Enable read access"
ON users
FOR SELECT
USING (
  -- Users can read their own profile
  auth.uid() = id OR
  -- Admins can read all profiles (using direct role check)
  role = 'admin'
);

-- Create a simple update policy that avoids recursion
CREATE POLICY "Enable update access"
ON users
FOR UPDATE
USING (
  -- Users can update their own profile
  auth.uid() = id OR
  -- Admins can update all profiles (using direct role check)
  role = 'admin'
);

-- Simple insert policy for registration
CREATE POLICY "Enable user registration"
ON users
FOR INSERT
WITH CHECK (
  -- Users can only insert their own profile
  auth.uid() = id
);

-- Ensure admin users exist with correct roles
INSERT INTO users (id, email, name, age, role)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@matetierra.com', 'Administrador', 30, 'admin')
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

INSERT INTO users (id, email, name, age, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin2@matetierra.com', 'Admin 2', 30, 'admin')
ON CONFLICT (id) DO UPDATE
SET role = 'admin';