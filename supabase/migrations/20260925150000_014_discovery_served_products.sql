ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS served_product_ids uuid[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_interactions_session_product
  ON user_interactions(session_id, product_id);
