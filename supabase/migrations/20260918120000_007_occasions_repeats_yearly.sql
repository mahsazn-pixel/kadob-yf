ALTER TABLE occasions
  ADD COLUMN IF NOT EXISTS repeats_yearly boolean NOT NULL DEFAULT true;

UPDATE occasions
  SET repeats_yearly = true
  WHERE source = 'birthday';
