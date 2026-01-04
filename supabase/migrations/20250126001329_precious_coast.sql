/*
  # Create product details view

  1. Changes
    - Create a view for product details that includes category information
    - Add RLS policies for the view
    - Update product service to use the view

  2. Security
    - Enable public read access to the view
*/

-- Create or replace the product details view
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
    p.created_at,
    p.updated_at
FROM products p
JOIN product_categories pc ON p.category_id = pc.id;

-- Grant access to the view
GRANT SELECT ON product_details TO anon, authenticated;

-- Create policy for public read access to the view
CREATE POLICY "Allow public read access to product details"
ON products
FOR SELECT
TO public
USING (true);