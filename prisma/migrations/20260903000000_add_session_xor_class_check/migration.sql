-- P2-4 Session multi-class integrity (Postgres cannot use subqueries in CHECK).
-- Keep data cleanup; enforce XOR via trigger instead of CHECK.

UPDATE "Session"
SET class_id = NULL
WHERE id IN (
  SELECT sc.session_id
  FROM "SessionClass" sc
  GROUP BY sc.session_id
  HAVING COUNT(sc.class_id) >= 2
)
AND class_id IS NOT NULL;

CREATE OR REPLACE FUNCTION session_single_class_or_pivot_xor_guard()
RETURNS trigger AS $$
BEGIN
  IF NEW.class_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM "SessionClass" sc WHERE sc.session_id = NEW.id) THEN
      RAISE EXCEPTION 'Session % cannot have both class_id and SessionClass rows', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS session_single_class_or_pivot_xor_trg ON "Session";
CREATE TRIGGER session_single_class_or_pivot_xor_trg
  BEFORE INSERT OR UPDATE OF class_id ON "Session"
  FOR EACH ROW
  EXECUTE PROCEDURE session_single_class_or_pivot_xor_guard();
