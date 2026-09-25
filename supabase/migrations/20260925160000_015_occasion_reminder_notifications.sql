CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_occasion_reminder
  ON notifications (user_id, type, ((payload_json->>'occasion_id')), ((payload_json->>'year')))
  WHERE type IN ('occasion_two_weeks', 'occasion_six_days');
