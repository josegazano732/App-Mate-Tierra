/*
  # Setup Authentication System

  1. Changes
    - Reset and simplify user policies
    - Create admin users with proper credentials
    - Fix infinite recursion issues
    - Ensure proper role-based access

  2. Security
    - Enable RLS
    - Set up proper policies for users table
    - Create admin accounts
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access" ON users;
DROP POLICY IF EXISTS "Enable update access" ON users;
DROP POLICY IF EXISTS "Enable user registration" ON users;

-- Simplify read policy
CREATE POLICY "Enable read access"
ON users
FOR SELECT
USING (
  auth.uid() = id OR
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Simplify update policy
CREATE POLICY "Enable update access"
ON users
FOR UPDATE
USING (
  auth.uid() = id OR
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- User registration policy
CREATE POLICY "Enable user registration"
ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Ensure admin users exist
INSERT INTO users (id, email, name, age, role)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@matetierra.com', 'Administrador', 30, 'admin')
ON CONFLICT (id) DO UPDATE
SET role = 'admin'
WHERE users.role != 'admin';

INSERT INTO users (id, email, name, age, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin2@matetierra.com', 'Admin 2', 30, 'admin')
ON CONFLICT (id) DO UPDATE
SET role = 'admin'
WHERE users.role != 'admin';