/*
  # Fix admin user setup

  1. Changes
    - Drop existing admin user if exists
    - Create new admin user with proper credentials
    - Ensure admin profile exists in public.users table
    - Set proper role and permissions
*/

-- First, ensure the admin user exists in auth.users with proper credentials
DO $$
BEGIN
    -- Delete existing admin user if exists to avoid conflicts
    DELETE FROM auth.users WHERE email = 'admin@matetierra.com';
    
    -- Insert new admin user with proper credentials
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'admin@matetierra.com',
        crypt('admin123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- Ensure admin profile exists in public.users
    INSERT INTO public.users (
        id,
        email,
        name,
        age,
        role,
        created_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'admin@matetierra.com',
        'Administrador',
        30,
        'admin',
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = 'admin';
END $$;