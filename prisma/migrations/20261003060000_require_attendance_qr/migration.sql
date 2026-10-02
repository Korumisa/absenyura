-- Preserve recorded attendance. Only upgrade sessions that previously bypassed QR.
UPDATE "Session"
SET qr_mode = 'STATIC',
    qr_token = replace(gen_random_uuid()::text, '-', ''),
    qr_secret = NULL
WHERE qr_mode = 'NONE';

ALTER TABLE "Session" ALTER COLUMN qr_mode SET DEFAULT 'DYNAMIC';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Session_qr_mode_required' AND conrelid = '"Session"'::regclass
  ) THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_qr_mode_required"
      CHECK (qr_mode IN ('STATIC', 'DYNAMIC'));
  END IF;
END $$;
