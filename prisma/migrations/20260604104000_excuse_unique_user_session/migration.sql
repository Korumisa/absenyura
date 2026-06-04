DELETE FROM "ExcuseRequest"
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, session_id
        ORDER BY created_at DESC, id DESC
      ) AS row_num
    FROM "ExcuseRequest"
  ) duplicates
  WHERE duplicates.row_num > 1
);

CREATE UNIQUE INDEX "ExcuseRequest_user_id_session_id_key" ON "ExcuseRequest"("user_id", "session_id");
