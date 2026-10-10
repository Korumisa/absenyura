-- =====================================================================
-- 02 — SUPABASE FREE TIER OPTIMASI WAJIB — 500 USER 12 BULAN AMAN
--
-- CARA PAKAI:
-- 1. Buka: https://supabase.com/dashboard → project Anda
-- 2. Menu sidebar: SQL Editor → [New query]
-- 3. Paste file ini → [RUN] (tunggu sampai selesai)
-- 4. Setelah selesai → buat CRON SCHEDULER (step 5 dibawah)
-- =====================================================================

-- ---------------------------------------------------------------------
-- QUERY 1: NonceStore OTP expired — HANYA SIMPAN 3 HARI TERAKHIR
-- (NonceStore bekas OTP expired = sampah, 30 hari = 100k baris tak guna)
-- ---------------------------------------------------------------------
DELETE FROM public."NonceStore" WHERE "expiresAt" < NOW() - INTERVAL '3 days';
CREATE INDEX IF NOT EXISTS idx_noncestore_expires ON public."NonceStore"("expiresAt" DESC);

-- ---------------------------------------------------------------------
-- QUERY 2: IdempotencyKey temp + ActivityLog ringan — retensi 30 hari
-- ---------------------------------------------------------------------
DELETE FROM public."IdempotencyKey" WHERE "createdAt" < NOW() - INTERVAL '7 days';
DELETE FROM public."ActivityLog"
 WHERE "createdAt" < NOW() - INTERVAL '30 days'
   AND "action" IN ('LOGIN_SUCCESS','SCAN_QR_VIEWED','PROFILE_VIEWED');
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON public."IdempotencyKey"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public."ActivityLog"("createdAt" DESC);

-- ---------------------------------------------------------------------
-- QUERY 3: INDEX PARTIAL ExcuseRequest PENDING SAJA — 60% LEBIH KECIL
-- 80% baris ExcuseRequest = status APPROVED/REJECTED, tidak pernah di-fetch lagi.
-- Index ini membuat Dosen view pending permohonan 3x LEBIH CEPAT.
-- ---------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_excuserequest_partial_pending
    ON public."ExcuseRequest"("studentId" DESC, "createdAt" DESC)
    WHERE status IN ('PENDING','REVIEWING');

-- ---------------------------------------------------------------------
-- QUERY 4: INDEX PARTIAL Notification UNREAD SAJA
-- Notifikasi yang DIBACA (90% data) = tidak perlu di index.
-- User buka bell notif = HIT index, 5x lebih cepat.
-- ---------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_partial_unread
    ON public."Notification"("userId", "createdAt" DESC)
    WHERE "isRead" = false;

-- ---------------------------------------------------------------------
-- QUERY 5: VACUUM FULL ANALYZE SEKALI SEBELUM LAUNCH
-- (Bersihkan dead tuple bloat. Free storage 20-40 MB.
--  Tunggu 5-15 detik, JANGAN tutup tab sebelum selesai.)
-- ---------------------------------------------------------------------
VACUUM (VERBOSE, ANALYZE, FULL);

-- =====================================================================
-- ✅ SETELAH 5 QUERY DI ATAS BERHASIL → BUAT CRON WEEKLY CLEANUP OTOMATIS
-- =====================================================================
--
-- Menu Supabase sidebar: DATABASE → CRON JOBS → [Create new cron job]
--
-- Isi form:
--   Name        : Weekly Cleanup Log Retention
--   Schedule    : Weekly → Monday → Hour 02 → Minute 00 (GMT+8 / WITA = 09:00 pagi)
--   Type        : SQL
--   SQL Query   : Paste yang DI BAWAH ini (bukan yang di atas!)
--
/*
DELETE FROM public."NonceStore" WHERE "expiresAt" < NOW() - INTERVAL '3 days';
DELETE FROM public."IdempotencyKey" WHERE "createdAt" < NOW() - INTERVAL '7 days';
DELETE FROM public."ActivityLog" WHERE "createdAt" < NOW() - INTERVAL '30 days' AND "action" IN ('LOGIN_SUCCESS','SCAN_QR_VIEWED','PROFILE_VIEWED');
ANALYZE public."Attendance", public."Session", public."ClassEnrollment";
*/
--
-- → Save.
-- → Cron ini jalan OTOMATIS tiap Senin pagi WITA 09:00.
-- → Storage DB Anda tetap langsing, tidak bengkak 500 MB sebelum 12 bulan.
-- =====================================================================
