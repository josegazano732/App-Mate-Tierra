/*
  # Add wholesale price support for products

  1. Changes
    - Add `wholesale_price` column to `products`
    - Add non-negative constraint for wholesale price
    - Refresh `product_details` view to expose wholesale price
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric(10,2);

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_wholesale_price_non_negative;

ALTER TABLE products
  ADD CONSTRAINT products_wholesale_price_non_negative
  CHECK (wholesale_price IS NULL OR wholesale_price >= 0);

DROP VIEW IF EXISTS product_details;

CREATE OR REPLACE VIEW product_details AS
SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.wholesale_price,
    p.image,
    p.image_urls,
    p.category_id,
    pc.name AS category_name,
    p.unit_of_measure,
    p.stock,
    p.seasonal,
    p.cost,
    p.markup_percentage,
    p.created_at,
    p.updated_at
FROM products p
JOIN product_categories pc ON p.category_id = pc.id;

GRANT SELECT ON product_details TO anon, authenticated;
