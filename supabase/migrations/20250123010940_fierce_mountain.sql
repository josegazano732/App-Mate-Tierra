/*
  # Create Reviews and Wishlists Tables

  1. New Tables
    - `product_reviews`
      - `id` (uuid, primary key) - Review unique identifier
      - `product_id` (uuid) - Reference to products table
      - `user_id` (uuid) - Reference to users table
      - `rating` (integer) - Rating from 1-5
      - `comment` (text) - Review comment
      - `created_at` (timestamp) - Review creation timestamp
      - `updated_at` (timestamp) - Last update timestamp
    
    - `wishlists`
      - `id` (uuid, primary key) - Wishlist item unique identifier
      - `user_id` (uuid) - Reference to users table
      - `product_id` (uuid) - Reference to products table
      - `created_at` (timestamp) - Creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Product reviews policies
CREATE POLICY "Anyone can read product reviews"
  ON product_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON product_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON product_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Wishlist policies
CREATE POLICY "Users can view their own wishlist"
  ON wishlists
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add to their own wishlist"
  ON wishlists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove from their own wishlist"
  ON wishlists
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);

-- Create function to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Add logic here if you want to store average rating in products table
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product rating updates
CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();