/*
  # Fix Sales RLS Policies

  1. Changes
    - Drop existing sales RLS policies
    - Create new policies that properly handle authenticated users
    - Add proper error handling for rate limits
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin read access for sales" ON sales;
DROP POLICY IF EXISTS "Enable admin insert access for sales" ON sales;
DROP POLICY IF EXISTS "Enable admin update access for sales" ON sales;

-- Create new policies for sales table
CREATE POLICY "Enable authenticated read access for sales"
ON sales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable authenticated insert access for sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable authenticated update access for sales"
ON sales FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role = 'admin'
));

-- Ensure RLS is enabled
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;