/*
  # Add unit of measure to products and support fractional quantities

  1. Changes
    - Add `unit_of_measure` to products with allowed values
    - Allow fractional stock in products
    - Allow fractional quantity in sale_items
    - Refresh product_details view to expose the new column
*/

-- Add unit_of_measure column
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit_of_measure text;

-- Drop view to allow stock type change
DROP VIEW IF EXISTS product_details;

UPDATE products
SET unit_of_measure = 'unidad'
WHERE unit_of_measure IS NULL OR trim(unit_of_measure) = '';

ALTER TABLE products
  ALTER COLUMN unit_of_measure SET DEFAULT 'unidad',
  ALTER COLUMN unit_of_measure SET NOT NULL;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_unit_of_measure_check;

ALTER TABLE products
  ADD CONSTRAINT products_unit_of_measure_check
  CHECK (unit_of_measure IN ('unidad', 'kg', 'gs'));

-- Allow fractional stock
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'stock'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE products
      ALTER COLUMN stock TYPE numeric(10,2)
      USING stock::numeric;
  END IF;
END $$;

-- Allow fractional quantities in sales
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sale_items'
      AND column_name = 'quantity'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE sale_items
      ALTER COLUMN quantity TYPE numeric(10,2)
      USING quantity::numeric;
  END IF;
END $$;

ALTER TABLE sale_items
  DROP CONSTRAINT IF EXISTS sale_items_quantity_check;

ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_quantity_check
  CHECK (quantity > 0);

-- Refresh product_details view
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
