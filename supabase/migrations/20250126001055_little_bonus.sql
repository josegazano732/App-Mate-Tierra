/*
  # Update products table structure
  
  1. Changes:
    - Remove category check constraint
    - Add category_id foreign key
    - Migrate existing data
    - Drop old category column
  
  2. Security:
    - Maintains existing RLS policies
*/

-- Create product_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- First, temporarily disable the check constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

-- Add category_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id uuid REFERENCES product_categories(id);
  END IF;
END $$;

-- Insert default categories if they don't exist
INSERT INTO product_categories (name, description) 
VALUES 
  ('Mates', 'Mates tradicionales y modernos'),
  ('Bombillas', 'Bombillas para mate'),
  ('Yerba', 'Yerba mate'),
  ('Termos', 'Termos para agua caliente'),
  ('Accesorios', 'Accesorios para mate')
ON CONFLICT (name) DO NOTHING;

-- Migrate existing data
DO $$
DECLARE
  product_record RECORD;
BEGIN
  FOR product_record IN SELECT * FROM products WHERE category_id IS NULL AND category IS NOT NULL LOOP
    UPDATE products 
    SET category_id = (
      SELECT id 
      FROM product_categories 
      WHERE name = product_record.category
    )
    WHERE id = product_record.id;
  END LOOP;
END $$;

-- Make category_id required
ALTER TABLE products ALTER COLUMN category_id SET NOT NULL;

-- Drop old category column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products DROP COLUMN category;
  END IF;
END $$;

-- Create function to get product details
CREATE OR REPLACE FUNCTION get_product_details(product_row products)
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'id', product_row.id,
    'name', product_row.name,
    'description', product_row.description,
    'price', product_row.price,
    'image', product_row.image,
    'category_id', product_row.category_id,
    'category_name', (SELECT name FROM product_categories WHERE id = product_row.category_id),
    'stock', product_row.stock,
    'created_at', product_row.created_at,
    'updated_at', product_row.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;