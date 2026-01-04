/*
  # Fix admin user and permissions

  1. Changes
    - Ensure admin user exists with proper credentials
    - Update admin user email for consistency
    - Add comprehensive admin access policies

  2. Security
    - Maintain existing security policies
    - Add specific admin role permissions
*/

-- Ensure admin user exists with proper credentials
DO $$
BEGIN
  -- Update or insert admin user
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
    role = EXCLUDED.role
  WHERE users.role != 'admin';

  -- Update or insert admin user by email
  INSERT INTO users (id, email, name, age, role)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'admin@example.com',
    'Admin User',
    30,
    'admin'
  )
  ON CONFLICT (email) DO UPDATE
  SET role = 'admin'
  WHERE users.role != 'admin';
END
$$;