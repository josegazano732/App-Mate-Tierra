/*
  # Update user insert policy

  1. Changes
    - Modify the user insert policy to handle registration properly
    - Allow users to insert their profile data during registration
    - Ensure proper security checks

  2. Security
    - Maintains data integrity by checking auth.uid() matches the inserted id
    - Allows new user registration while maintaining security
*/

-- Drop the existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create a new insert policy that properly handles registration
CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = users.id
    )
  );