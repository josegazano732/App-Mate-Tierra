/*
  # Payment Methods Management

  1. New Tables
    - `payment_methods`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `code` (text, unique)
      - `active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payment_methods` table
    - Add policies for admin access
*/

-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable public read access for payment methods"
ON payment_methods FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable admin insert access for payment methods"
ON payment_methods FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable admin update access for payment methods"
ON payment_methods FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable admin delete access for payment methods"
ON payment_methods FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create timestamp update trigger
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_methods_timestamp
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Insert default payment methods
INSERT INTO payment_methods (name, code) VALUES
  ('Efectivo', 'cash'),
  ('Tarjeta de Crédito/Débito', 'card'),
  ('Transferencia Bancaria', 'transfer'),
  ('Mercado Pago', 'mp')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

-- Modify sales table to use payment_methods reference
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_fkey 
  FOREIGN KEY (payment_method) 
  REFERENCES payment_methods(code)
  ON UPDATE CASCADE;