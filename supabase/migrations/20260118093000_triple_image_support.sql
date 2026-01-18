/*
  # Add support for multiple product images

  1. Changes
    - Add image_urls array column to products table (max 3 images stored client-side)
    - Backfill existing rows so image_urls always contains the primary image when available
    - Refresh product_details view to expose the new column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE products
      ADD COLUMN image_urls text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Ensure image_urls never remains NULL and backfill current data
UPDATE products
SET image_urls = CASE
  WHEN image_urls IS NULL OR array_length(image_urls, 1) = 0 THEN
    CASE
      WHEN coalesce(image, '') <> '' THEN ARRAY[image]
      ELSE ARRAY[]::text[]
    END
  ELSE image_urls
END;

-- Make sure the column has a default and is not nullable
ALTER TABLE products
  ALTER COLUMN image_urls SET DEFAULT ARRAY[]::text[];

ALTER TABLE products
  ALTER COLUMN image_urls SET NOT NULL;

-- Drop the view so we can redefine the column order cleanly
DROP VIEW IF EXISTS product_details;

-- Refresh the product_details view with the new column
CREATE OR REPLACE VIEW product_details AS
SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.image,
    p.image_urls,
    p.category_id,
    pc.name AS category_name,
    p.stock,
    p.seasonal,
    p.cost,
    p.markup_percentage,
    p.created_at,
    p.updated_at
FROM products p
JOIN product_categories pc ON p.category_id = pc.id;

GRANT SELECT ON product_details TO anon, authenticated;
