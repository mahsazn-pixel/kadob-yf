-- Add birth_date to profiles so linked users can manage their own birthday
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- Allow authenticated users to read public wishlists of other users
DROP POLICY IF EXISTS "select_public_wishlist" ON wishlist_items;
CREATE POLICY "select_public_wishlist" ON wishlist_items FOR SELECT
  TO authenticated USING (visibility = 'public');

-- Allow users to update their own profile birth_date (already covered by update_own_profile, but ensure birth_date is updatable)
-- The existing "update_own_profile" policy already covers all columns since it uses USING/WITH CHECK on auth.uid() = id