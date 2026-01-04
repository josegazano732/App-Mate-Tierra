/*
  # Fix admin user credentials

  1. Changes
    - Ensure admin user exists with correct credentials
    - Set proper role and email
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