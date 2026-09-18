CREATE TABLE IF NOT EXISTS my_occasions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  occasion_date date NOT NULL,
  repeats_yearly boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT my_occasions_visibility_check CHECK (visibility IN ('public', 'very_close'))
);

ALTER TABLE my_occasions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_my_occasions" ON my_occasions;
CREATE POLICY "select_own_my_occasions" ON my_occasions FOR SELECT
  TO authenticated USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "select_shared_my_occasions" ON my_occasions;
CREATE POLICY "select_shared_my_occasions" ON my_occasions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM close_people
      WHERE close_people.owner_user_id = auth.uid()
        AND close_people.linked_user_id = my_occasions.owner_user_id
        AND (
          my_occasions.visibility = 'public'
          OR (my_occasions.visibility = 'very_close' AND close_people.closeness = 'very_close')
        )
    )
  );

DROP POLICY IF EXISTS "insert_own_my_occasions" ON my_occasions;
CREATE POLICY "insert_own_my_occasions" ON my_occasions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "update_own_my_occasions" ON my_occasions;
CREATE POLICY "update_own_my_occasions" ON my_occasions FOR UPDATE
  TO authenticated USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "delete_own_my_occasions" ON my_occasions;
CREATE POLICY "delete_own_my_occasions" ON my_occasions FOR DELETE
  TO authenticated USING (auth.uid() = owner_user_id);

CREATE INDEX IF NOT EXISTS idx_my_occasions_owner ON my_occasions(owner_user_id);
