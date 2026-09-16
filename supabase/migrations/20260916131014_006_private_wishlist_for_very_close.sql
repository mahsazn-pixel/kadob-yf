/*
# Private wishlist visible to very-close people

## Summary
Currently, wishlist items with visibility='public' are visible to all authenticated users,
and private items are only visible to the owner. This migration adds a new RLS policy
so that private wishlist items are also visible to users who have the wishlist owner
in their close_people list with closeness='very_close'.

## Changes
1. New RLS policy: `select_private_wishlist_for_very_close`
   - Allows an authenticated user to SELECT private wishlist items
     if they have a close_people entry where:
       - close_people.owner_user_id = auth.uid() (the viewer owns the relationship)
       - close_people.linked_user_id = wishlist_items.owner_user_id (the wishlist owner is the linked person)
       - close_people.closeness = 'very_close'
   - This means: if user A has user B in their close_people list marked as "very_close",
     user A can see user B's private wishlist items.

## Security
- The policy uses a subquery against close_people with proper ownership checks.
- Only the owner of the close_people relationship can see the linked user's private wishlist.
- The closeness level must be 'very_close' - 'close' and 'acquaintance' are not enough.
*/

DROP POLICY IF EXISTS "select_private_wishlist_for_very_close" ON wishlist_items;
CREATE POLICY "select_private_wishlist_for_very_close" ON wishlist_items FOR SELECT
  TO authenticated USING (
    visibility = 'private'
    AND EXISTS (
      SELECT 1 FROM close_people
      WHERE close_people.owner_user_id = auth.uid()
        AND close_people.linked_user_id = wishlist_items.owner_user_id
        AND close_people.closeness = 'very_close'
    )
  );