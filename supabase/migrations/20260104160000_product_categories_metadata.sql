/*
  # Extend product_categories metadata

  1. Changes
    - Add slug, image_url, is_active and display_order fields
    - Backfill slug values from existing names
    - Ensure uniqueness and helpful indexes for ordering

  2. Security
    - No policy changes required; existing RLS policies cover the new columns
*/

ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order integer;

-- Backfill slug data where missing, using a simplified slug generator
UPDATE product_categories
SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'))
WHERE (slug IS NULL OR slug = '')
  AND name IS NOT NULL;

-- Ensure slug uniqueness only if the constraint does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_categories_slug_key'
  ) THEN
    ALTER TABLE product_categories
      ADD CONSTRAINT product_categories_slug_key UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS product_categories_display_order_idx
  ON product_categories (COALESCE(display_order, 0), name);
