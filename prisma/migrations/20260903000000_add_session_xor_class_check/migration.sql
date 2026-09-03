-- P2-4 Session multi-class XOR integrity DB-level last resort CHECK constraint
-- Application logic in controller layer already ensures: KEDUA class_id is never non-null SAMA session_classes ada (lebih dari 2026-Q4

-- Pre-migration data cleanup: set class_id = NULL jika multi-class session class_id masih non-null anomali
UPDATE "Session"
SET class_id = NULL
WHERE id IN (
  SELECT sc.session_id
  FROM "SessionClass" sc
  GROUP BY sc.session_id
  HAVING COUNT(sc.class_id) >= 2
)
AND class_id IS NOT NULL;

-- DB-level CHECK constraint (last-resort integrity guard)
-- PostgreSQL only (SQLite dev tidak mendukung).
-- Catatan: SQLite tidak mendukung ALTER TABLE ADD CONSTRAINT EXISTS subquery.
-- Production = PostgreSQL (production Postgres SQLite, constraint DIPAKAI.

ALTER TABLE "Session" ADD CONSTRAINT session_single_class_or_pivot_xor
  CHECK (
    (class_id IS NOT NULL) OR
    (EXISTS (SELECT 1 FROM "SessionClass" sc WHERE sc.session_id = "Session".id))
  );
