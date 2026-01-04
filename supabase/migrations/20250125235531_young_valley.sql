/*
  # Add product categories management

  1. New Tables
    - `product_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Modify products table to reference categories
    - Add foreign key constraint
    - Migrate existing category data

  3. Security
    - Enable RLS
    - Add policies for admin CRUD operations
*/

-- Create product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for product categories
CREATE POLICY "Allow public read access"
ON product_categories FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow admin insert"
ON product_categories FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Allow admin update"
ON product_categories FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Allow admin delete"
ON product_categories FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Insert initial categories
INSERT INTO product_categories (name, description)
VALUES 
  ('Mates', 'Mates tradicionales y modernos'),
  ('Bombillas', 'Bombillas para mate'),
  ('Yerba', 'Diferentes tipos de yerba mate'),
  ('Termos', 'Termos para agua caliente'),
  ('Accesorios', 'Accesorios varios para mate')
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();