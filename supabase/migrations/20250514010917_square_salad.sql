/*
  # Add cost and markup fields to products

  1. Changes
    - Add cost field to products table
    - Add markup_percentage field to products table
    - Update product_details view
*/

DO $$ 
BEGIN
  -- Check if the columns don't exist before adding them
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cost'
  ) THEN
    ALTER TABLE products
    ADD COLUMN cost decimal(10,2) DEFAULT 0 CHECK (cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'markup_percentage'
  ) THEN
    ALTER TABLE products
    ADD COLUMN markup_percentage decimal(5,2) DEFAULT 30 CHECK (markup_percentage >= 0);
  END IF;
END $$;

-- Recreate the view to include new fields
CREATE OR REPLACE VIEW product_details AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image,
    p.category_id,
    pc.name as category_name,
    p.stock,
    p.seasonal,
    p.cost,
    p.markup_percentage,
    p.created_at,
    p.updated_at
FROM products p
JOIN product_categories pc ON p.category_id = pc.id;

-- Grant access to the view
GRANT SELECT ON product_details TO anon, authenticated;