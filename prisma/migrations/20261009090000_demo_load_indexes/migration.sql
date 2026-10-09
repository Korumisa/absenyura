-- Speed up dashboard groupBy and session cron lookups during concurrent reads.
CREATE INDEX IF NOT EXISTS "Attendance_user_id_status_idx" ON "Attendance"("user_id", "status");
CREATE INDEX IF NOT EXISTS "Session_status_check_in_open_at_idx" ON "Session"("status", "check_in_open_at");
CREATE INDEX IF NOT EXISTS "Session_status_session_end_idx" ON "Session"("status", "session_end");
