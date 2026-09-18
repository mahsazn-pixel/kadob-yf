CREATE TABLE IF NOT EXISTS greetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  receiver_person_id uuid NOT NULL,
  receiver_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  occasion_id uuid,
  occasion_title text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT greetings_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE greetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sent_greetings" ON greetings;
CREATE POLICY "select_own_sent_greetings" ON greetings FOR SELECT
  TO authenticated USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);

DROP POLICY IF EXISTS "insert_own_greetings" ON greetings;
CREATE POLICY "insert_own_greetings" ON greetings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "update_received_greetings" ON greetings;
CREATE POLICY "update_received_greetings" ON greetings FOR UPDATE
  TO authenticated USING (auth.uid() = receiver_user_id)
  WITH CHECK (auth.uid() = receiver_user_id);

CREATE INDEX IF NOT EXISTS idx_greetings_receiver_user ON greetings(receiver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_greetings_receiver_person ON greetings(receiver_person_id, status);
