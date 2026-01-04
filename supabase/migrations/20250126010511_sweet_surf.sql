/*
  # Fix category deletion constraints

  1. Changes
    - Add ON DELETE RESTRICT to category_id foreign key
    - Add function to check if category has products before deletion
    - Add trigger to prevent deletion of categories with products

  2. Security
    - Maintain existing RLS policies
*/

-- First recreate the foreign key with RESTRICT
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS products_category_id_fkey,
  ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES product_categories(id) 
    ON DELETE RESTRICT;

-- Create function to check if category has products
CREATE OR REPLACE FUNCTION check_category_products()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM products 
    WHERE category_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete category that has associated products'
      USING HINT = 'Remove or reassign all products in this category before deleting it';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of categories with products
DROP TRIGGER IF EXISTS prevent_category_deletion_with_products ON product_categories;
CREATE TRIGGER prevent_category_deletion_with_products
  BEFORE DELETE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION check_category_products();