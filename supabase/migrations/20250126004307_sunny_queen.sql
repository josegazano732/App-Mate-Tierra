/*
  # Add Seasonal Products Support

  1. Changes
    - Add seasonal flag to products table
    - Update product_details view to include seasonal flag
*/

-- Add seasonal flag to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS seasonal boolean DEFAULT false;

-- Drop existing view if it exists
DROP VIEW IF EXISTS product_details;

-- Recreate the view with all columns including seasonal
CREATE VIEW product_details AS
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
    p.created_at,
    p.updated_at
FROM products p
JOIN product_categories pc ON p.category_id = pc.id;

-- Grant access to the view
GRANT SELECT ON product_details TO anon, authenticated;