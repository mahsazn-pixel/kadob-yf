/*
# Kadoba Core Schema — Part 2: Discovery, Interactions, Shopping List, Notifications

1. New Tables
- `discovery_sessions` — a discovery round (max 20 cards), owner-scoped
- `user_interactions` — reactions (no/good/great/the_one) to products within a session
- `shopping_list_items` — gift tracking: reserved → purchased → gifted, owner-scoped
- `notifications` — user notifications with scheduling and read status

2. Security
- RLS enabled on all tables
- discovery_sessions: owner-scoped CRUD
- user_interactions: owner-scoped CRUD (via session ownership)
- shopping_list_items: owner-scoped CRUD
- notifications: owner-scoped CRUD

3. Notes
- Discovery session stores filters_json (budget, age_group, gender, closeness, occasion_id)
- Session status: active → completed (the_one or review) or failed
- Shopping list status: reserved → purchased → gifted; cancel is an action
- All owner columns default to auth.uid()
*/

-- DISCOVERY SESSIONS
CREATE TABLE IF NOT EXISTS discovery_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES close_people(id) ON DELETE CASCADE,
  filters_json jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  shown_count int DEFAULT 0,
  max_cards int DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE discovery_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON discovery_sessions;
CREATE POLICY "select_own_sessions" ON discovery_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON discovery_sessions;
CREATE POLICY "insert_own_sessions" ON discovery_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON discovery_sessions;
CREATE POLICY "update_own_sessions" ON discovery_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON discovery_sessions;
CREATE POLICY "delete_own_sessions" ON discovery_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_receiver ON discovery_sessions(user_id, receiver_id, created_at DESC);

-- USER INTERACTIONS
CREATE TABLE IF NOT EXISTS user_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES close_people(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  session_id uuid NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  "timestamp" timestamptz DEFAULT now()
);
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_interactions" ON user_interactions;
CREATE POLICY "select_own_interactions" ON user_interactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_interactions" ON user_interactions;
CREATE POLICY "insert_own_interactions" ON user_interactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_interactions" ON user_interactions;
CREATE POLICY "update_own_interactions" ON user_interactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_interactions" ON user_interactions;
CREATE POLICY "delete_own_interactions" ON user_interactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_interactions_session ON user_interactions(session_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_interactions_receiver_product ON user_interactions(receiver_id, product_id);

-- SHOPPING LIST ITEMS
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES close_people(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status text DEFAULT 'reserved',
  session_id uuid REFERENCES discovery_sessions(id) ON DELETE SET NULL,
  reserved_at timestamptz DEFAULT now(),
  purchased_at timestamptz,
  gifted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_shopping_list" ON shopping_list_items;
CREATE POLICY "select_own_shopping_list" ON shopping_list_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_shopping_list" ON shopping_list_items;
CREATE POLICY "insert_own_shopping_list" ON shopping_list_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_shopping_list" ON shopping_list_items;
CREATE POLICY "update_own_shopping_list" ON shopping_list_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_shopping_list" ON shopping_list_items;
CREATE POLICY "delete_own_shopping_list" ON shopping_list_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_user_status ON shopping_list_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_shopping_list_receiver_product ON shopping_list_items(receiver_id, product_id, status);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload_json jsonb DEFAULT '{}',
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled ON notifications(user_id, scheduled_at, status);
