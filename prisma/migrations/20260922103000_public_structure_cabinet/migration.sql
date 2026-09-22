-- PublicStructureCabinet was added to schema.prisma without a migration.
-- This brings prod (and any env still on the old group-only shape) up to date.
-- Idempotent so environments that already db-pushed the table still succeed.

CREATE TABLE IF NOT EXISTS "PublicStructureCabinet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicStructureCabinet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PublicStructureCabinet_is_active_sort_order_idx"
  ON "PublicStructureCabinet"("is_active", "sort_order");

ALTER TABLE "PublicStructureGroup"
  ADD COLUMN IF NOT EXISTS "cabinet_id" TEXT;

INSERT INTO "PublicStructureCabinet" ("id", "name", "period", "is_active", "sort_order", "created_at", "updated_at")
SELECT
  '00000000-0000-4000-8000-000000000001',
  'Kabinet',
  'Legacy',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PublicStructureCabinet" LIMIT 1);

UPDATE "PublicStructureGroup" g
SET "cabinet_id" = (
  SELECT c."id" FROM "PublicStructureCabinet" c ORDER BY c."created_at" ASC LIMIT 1
)
WHERE g."cabinet_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'PublicStructureGroup' AND column_name = 'cabinet_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "PublicStructureGroup" ALTER COLUMN "cabinet_id" SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PublicStructureGroup_cabinet_id_fkey'
  ) THEN
    ALTER TABLE "PublicStructureGroup"
      ADD CONSTRAINT "PublicStructureGroup_cabinet_id_fkey"
      FOREIGN KEY ("cabinet_id") REFERENCES "PublicStructureCabinet"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
