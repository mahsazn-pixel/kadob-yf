/*
# Wishlist gift holds

When a close person reserves or purchases an item from someone else's wishlist,
mark the wishlist row so other visitors can see it is already taken.
The wishlist owner still sees the item without a reserved badge.
*/

ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS reserved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS reserved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wishlist_reserved_by ON wishlist_items(reserved_by_user_id);

DROP POLICY IF EXISTS "select_gift_holds_for_linked_receiver" ON shopping_list_items;
CREATE POLICY "select_gift_holds_for_linked_receiver" ON shopping_list_items FOR SELECT
  TO authenticated USING (
    status IN ('reserved', 'purchased')
    AND auth.uid() <> user_id
    AND EXISTS (
      SELECT 1 FROM close_people viewer_rel
      WHERE viewer_rel.owner_user_id = auth.uid()
        AND viewer_rel.linked_user_id IS NOT NULL
        AND viewer_rel.linked_user_id <> auth.uid()
        AND EXISTS (
          SELECT 1 FROM close_people giver_rel
          WHERE giver_rel.id = shopping_list_items.receiver_id
            AND giver_rel.linked_user_id = viewer_rel.linked_user_id
        )
    )
  );
