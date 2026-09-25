/*
  Atomic gift reservation.

  Two concurrent users must not both reserve the same wishlist item
  or the same product for the same receiver.
*/

CREATE OR REPLACE FUNCTION claim_wishlist_hold(
  p_owner_user_id uuid,
  p_product_id uuid,
  p_reserved_by uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
  item_exists boolean;
BEGIN
  UPDATE wishlist_items
  SET
    reserved_by_user_id = p_reserved_by,
    reserved_at = now()
  WHERE owner_user_id = p_owner_user_id
    AND product_id = p_product_id
    AND (reserved_by_user_id IS NULL OR reserved_by_user_id = p_reserved_by);

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM wishlist_items
    WHERE owner_user_id = p_owner_user_id
      AND product_id = p_product_id
  ) INTO item_exists;

  RETURN NOT item_exists;
END;
$$;

REVOKE ALL ON FUNCTION claim_wishlist_hold(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_wishlist_hold(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_wishlist_hold(uuid, uuid, uuid) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_list_active_hold
  ON shopping_list_items (receiver_id, product_id)
  WHERE status IN ('reserved', 'purchased')
    AND receiver_id IS NOT NULL;
