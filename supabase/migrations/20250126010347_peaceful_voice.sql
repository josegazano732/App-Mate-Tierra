/*
  # Add seasonal flag and update product details view

  1. Changes
    - Add seasonal boolean column to products table
    - Update product_details view to include seasonal flag
    - Ensure proper column ordering and naming

  2. Security
    - Maintain existing permissions on view
*/

-- First drop the existing view if it exists
DROP VIEW IF EXISTS product_details;

-- Add seasonal flag to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS seasonal boolean DEFAULT false;

-- Create the view with the correct column order
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