/*
  # Add user insert policy

  1. Changes
    - Add policy to allow users to insert their own profile data during registration
    - This policy is essential for the registration process to work properly

  2. Security
    - Policy ensures users can only insert their own data
    - Maintains data integrity by checking auth.uid matches the inserted id
*/

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);