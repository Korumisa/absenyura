-- Migration: add_user_must_change_password_cols
-- Created: 2026-10-01 04:10:00 UTC
-- Root cause: Prisma P2022 "The column User.must_change_password does not exist"
-- Schema source: prisma/schema.prisma lines 28, 29, 30
--   must_change_password        Boolean  @default(true)
--   last_password_change        DateTime?
--   password_attempts           Int      @default(0)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'User'
      AND column_name  = 'must_change_password'
  ) THEN
    ALTER TABLE "public"."User"
      ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'User'
      AND column_name  = 'last_password_change'
  ) THEN
    ALTER TABLE "public"."User"
      ADD COLUMN "last_password_change" TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'User'
      AND column_name  = 'password_attempts'
  ) THEN
    ALTER TABLE "public"."User"
      ADD COLUMN "password_attempts" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Post-migration verification helper (run manually in Supabase SQL Editor to confirm):
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'User'
--   AND column_name IN ('must_change_password','last_password_change','password_attempts')
-- ORDER BY column_name;
