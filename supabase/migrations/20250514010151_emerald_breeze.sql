/*
  # Add cost and markup fields to products

  1. Changes
    - Add cost field to products table
    - Add markup_percentage field to products table
    - Update product_details view
*/

-- Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost decimal(10,2) DEFAULT 0 CHECK (cost >= 0),
ADD COLUMN IF NOT EXISTS markup_percentage decimal(5,2) DEFAULT 30 CHECK (markup_percentage >= 0);

-- Drop and recreate the view to include new fields
DROP VIEW IF EXISTS product_details;

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
    p.cost,
    p.markup_percentage,
    p.created_at,
    p.updated_at
FROM products p
JOIN product_categories pc ON p.category_id = pc.id;

-- Grant access to the view
GRANT SELECT ON product_details TO anon, authenticated;