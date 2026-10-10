# SELF-HOST CUTOVER PLAN: Supabase → PostgreSQL VPS Local

---

> **Target**: Memindahkan data produksi absensi dari Supabase managed ke PostgreSQL 16 self-host VPS Hostinger KVM 2.
> **Duration Window**: 2 JAM MAINTENANCE.
> **Rekomendasi Jadwal**: Hari Jumat sore 16:00 - 18:00 WITA (luar jam absen, mahasiswa pulang, tidak ada pertemuan kuliah).
> **Personil Minimum**: 2 orang.
>
> - Operator A: SSH VPS (eksekusi migration command).
> - Operator B: Verifikasi user acceptance test + koordinasi grup WA pengumuman.
>   **Rollback Plan**: Jika step 6 gagal / data tidak kompatibel — DNS revert dalam 15 menit kembali ke Supabase existing.

---

## Pra-Syarat WAJIB SEBELUM JALANKAN CUTOVER (Checklist H-1)

```
☑ VPS sudah melalui SEMUA step 0 s/d step 8 deploy/selfhost/README.md
☑ PRELAUNCH 50-ITEM AUDIT CHECKLIST = PASS 48+/50 (max 2 WARN, 0 FAIL)
☑ `npx prisma migrate deploy` di VPS self-host sudah APPLIED SEMUA migration (hmsdp DB table structure IDENTIC dengan Supabase).
☑ Cloudinary, rclone, cron, PM2, Nginx SSL = SUDAH VERIFIED OK di VPS baru.
☑ TTL DNS domain di-set 60 detik SEMINGGU SEBELUM cutover (supaya propagate cepat 15 menit).
☑ Terakhir: BACKUP PENUH Supabase via pg_dump H-1 sebelum cutover:
    Supabase Project → Settings → Database → Connection String (Direct port 5432, bukan pooler)
    Jalankan di LAPTOP atau VPS baru:
    PGSSLMODE=require pg_dump -Fc -d "postgresql://postgres.PROJECT_REF:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres" | gzip > hmsdp-supabase-precutover-$(date +%Y%m%d-%H%M).dump.gz
    SHA256 checksum file ini disimpan di Notion / Google Docs.
☑ Pengumuman grup WA HM SDP + grup WA Prodi terkait:
    "Pemeliharaan sistem absen Kamis 16:00-18:00 WITA. Selama window, mohon JANGAN scan QR atau ubah data apapun. Data sampai Kamis 15:59:59 WITA DIJAMIN TIDAK HILANG."
```

---

## 8 STEP CUTOVER EXECUTION — 2 JAM WINDOW

| Step  | Action                                                                           | Time Estimate | Operator |
| ----- | -------------------------------------------------------------------------------- | ------------- | -------- |
| **1** | Enable Maintenance Mode Supabase Existing                                        | 2 menit       | B        |
| **2** | FINAL pg_dump Supabase → local file (window terbaru 0-2 menit sejak maintenance) | 3-10 menit    | A        |
| **3** | Copy dump ke VPS Hostinger + SHA verify                                          | 2 menit       | A        |
| **4** | RESTORE ke hmsdp VPS self-host (pg_restore --no-owner)                           | 5-30 menit    | A        |
| **5** | ANALYZE + VACUUM + reindex                                                       | 5 menit       | A        |
| **6** | **User Acceptance Test** 25-tiket smoke test di VPS IP / staging domain          | 20 menit      | A + B    |
| **7** | SWITCH DNS A-record domain → IP VPS Hostinger                                    | 15 propagasi  | B        |
| **8** | Monitor 1 JAM: health + error log + DR backup final                              | 60 menit      | A + B    |

---

### STEP 1 — MAINTENANCE MODE Supabase Existing (00:00 → 00:02)

Tujuan: Tidak ada INSERT/UPDATE data selama proses dump (data konsisten point-in-time).

```bash
# Opsi A: Via Nginx config VPS existing (jika Vercel — temporary redirect):
#   Di Vercel Project → Settings → Deployment Protection → Password Protect + set password.
# ATAU Vercel Edge Config return 503 maintenance page.
# Opsi B: Cepat — ubah di Supabase Postgres langsung:
#   Login Supabase SQL Editor → jalankan 3 perintah berikut:
#
# -- 1. Revoke write privileges untuk app user (read only semua tabel):
#   REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
#   ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;
# -- 2. Set transaction read only untuk semua koneksi baru app:
#   ALTER ROLE authenticator SET default_transaction_read_only = on;
#   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='authenticator';
# -- 3. Pengumuman di app: Tambahkan banner via direct edit di table Setting public.SiteBanner.
```

Setelah ini: user TIDAK BISA submit data baru, TAPI masih bisa lihat laporan / attendance history (baca).

---

### STEP 2 — FINAL DATABASE DUMP SUPABASE (00:02 → 00:12)

```bash
# Jalankan dari LAPTOP / VPS BARU (dari VPS BARU lebih cepat — SG ke SG bandwidth tinggi).
# PAKAI DIRECT URL Supabase PORT 5432, BUKAN POOLER 6543 (pooler tidak support pg_dump large object).
SUPABASE_DIRECT="postgresql://postgres.PROJECT_REF:STRONGPASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
DMP="hmsdp-cutover-$(date +%Y%m%d-%H%M%S).dump"
echo "Starting final dump at $(date)"
time PGSSLMODE=require pg_dump -Fc -d "$SUPABASE_DIRECT" --compress=0 --file="$DMP" --quote-all-identifiers \
    --exclude-schema=auth --exclude-schema=storage --exclude-schema=vault --exclude-schema=extensions \
    --exclude-table-data="public.ChallengeNonce" --exclude-table-data="public.IdempotencyKey"
# (ChallengeNonce + IdempotencyKey = data volatile, tidak perlu transfer, regenerate di VPS baru)
echo "Dump done at $(date). Size: $(du -sh "$DMP" | cut -f1)"
# SHA256 integrity:
sha256sum "$DMP" > "${DMP}.sha256"
cat "${DMP}.sha256"
```

Catat size file + SHA256 ke log cutover.

---

### STEP 3 — TRANSFER DUMP KE VPS HOSTINGER (00:12 → 00:15)

```bash
# Dari laptop:
scp -i ~/.ssh/deploy_ed25519 "${DMP}" "${DMP}.sha256" deploy@IP_VPS_HOSTINGER:/tmp/
# Dari VPS Hostinger, VERIFY SHA sebelum restore:
ssh deploy@IP_VPS_HOSTINGER "cd /tmp && sha256sum -c ${DMP}.sha256"
# Expected: "hmsdp-cutover-...dump: OK"
# ❌ Jika FAILED → re-transfer. JANGAN lanjut restore SHA mismatch → silent data corruption!
```

---

### STEP 4 — RESTORE DUMP ke VPS Self-Host (00:15 → 00:45)

```bash
ssh deploy@IP_VPS_HOSTINGER
sudo su - postgres
# 4.1 DROP DATABASE existing hmsdp yang isinya cuma migration + seed (PENTING):
psql -d postgres -c "DROP DATABASE IF EXISTS hmsdp;"
# 4.2 RECREATE database OWNER hmsdp_app:
psql -d postgres -c "CREATE DATABASE hmsdp OWNER hmsdp_app ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0;"
# 4.3 Restore dari dump (jobs=4 paralel untuk percepat, --no-owner LEBIH AMAN — kita assign privileges nanti):
time pg_restore -d hmsdp --jobs=4 --no-owner --no-privileges --clean --if-exists --exit-on-error /tmp/hmsdp-cutover-*.dump
echo "Restore exit code: $?"
# 4.4 Set privileges untuk hmsdp_app (agar Prisma app bisa baca tulis):
psql -d hmsdp <<'EOSQL'
REASSIGN OWNED BY postgres TO hmsdp_app;
GRANT ALL ON SCHEMA public TO hmsdp_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO hmsdp_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO hmsdp_app;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO hmsdp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hmsdp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hmsdp_app;
EOSQL
# 4.5 Fix sequence next value (supaya insert baru tidak PK conflict):
psql -d hmsdp -c "SELECT setval(seq, GREATEST(coalesce(max_id,1),1) + 50) FROM (SELECT pg_get_serial_sequence('public.\"'||tablename||'\"','id') seq, max(id) max_id FROM pg_tables t JOIN (SELECT 'Attendance' tablename, id FROM public.\"Attendance\" UNION ALL SELECT 'User',id FROM public.\"User\" UNION ALL SELECT 'Session',id FROM public.\"Session\" UNION ALL SELECT 'Class',id FROM public.\"Class\") USING (tablename) WHERE schemaname='public' GROUP BY 1) x WHERE seq IS NOT NULL;" 2>/dev/null || echo "auto-fix sequence skipped — aman jika id adalah UUID bukan bigserial."
echo "Restore privileges OK"
```

---

### STEP 5 — VACUUM ANALYZE + REINDEX (00:45 → 00:50)

Optimize planner statistics dan index validitas setelah restore bulk.

```bash
sudo -u postgres psql -d hmsdp -c "VACUUM (ANALYZE, VERBOSE);"
sudo -u postgres psql -d hmsdp -c "REINDEX DATABASE hmsdp;"
echo "Analyze + Reindex OK"
```

---

### STEP 6 — USER ACCEPTANCE TEST 25-TIKET DI VPS BARU (00:50 → 01:10)

Buka browser incognito, **AKSES LANGSUNG IP VPS**: `https://<IP_VPS>/` (Nginx sudah config server_name domain + IP OK jika kita pakai default_server). **JANGAN DNS SWITCH DULU.**

Jalankan TICKET STEP 11 dari deploy/selfhost/README.md (25 tiket). FOKUS khusus TIKET INI:

- `T05 Login sebagai Supabase superadmin LAMA apakah password bekerja?` (jika tidak — karena hash bcrypt @node-rs/bcrypt compatible. Jika FAIL: reset 1 password admin via prisma seed ulang)
- `T12 Attendance COUNT TOTAL di dashboard = SAMA PERSIS dengan dashboard Supabase existing?`
  ```sql
  SELECT count(*) FROM public."Attendance";
  SELECT count(*) FROM public."User";
  SELECT count(*) FROM public."Session";
  SELECT count(*) FROM public."Class";
  ```
  Jalankan di keduanya. HASIL HARUS SAMA PERSIS. Toleransi 0 row.
- `T19 User biasa buka Riwayat Absensi bulan lalu = data SAMA dengan Supabase existing?`
- `T25 Final Test Backup & Restore VPS self-host: jalankan backup.sh manual sekali. exit code 0.`

✅ **Jika 25/25 PASS + row count SAMA**: LANJUT STEP 7 DNS SWITCH.
❌ **Jika ada row count BERBEDA atau 1 FAIL KRITIS**: ROLLBACK (lihat bagian bawah dokumen).

---

### STEP 7 — DNS SWITCH DOMAIN KE IP VPS HOSTINGER (01:10 → 01:25)

```bash
# Ubah DNS provider (Cloudflare / NSHostinger / dll):
# A record      your-domain.com   → IP_VPS_HOSTINGER (TTL 60)
# A record  www.your-domain.com   → IP_VPS_HOSTINGER (TTL 60)
# (kalau pakai Cloudflare Proxy Orange = ON — JANGAN, biarkan abu-abu DNS only dulu 1 jam, baru ON untuk cache static assets)

# Operator B monitoring DNS propagate:
#   watch dig @1.1.1.1 A +short your-domain.com   (Cloudflare resolver)
#   watch dig @8.8.8.8 A +short your-domain.com   (Google resolver)
#   watch dig @dns1.p01.nsone.net A +short your-domain.com
# Tunggu 80% client resolver Indonesia return IP VPS Hostinger baru → dilanjutkan.
```

Saat propagate 80%+ → **Maintenance mode OFF**:

- Nginx hapus return 503 maintenance.
- Banner app di-setting dihapus.

---

### STEP 8 — MONITOR 1 JAM POST-CUTOVER (01:25 → 02:25)

Jalankan setiap 10 menit. Copy hasil ke log cutover.

```
1. pm2 status hmsdp-absenyura  — restarts = 0
2. sudo pg_isready  — accepting connections
3. df -h /           — Use% < 85%
4. top -bn1 | head -5 — load average < 1.5 (dual core KVM2 = <2 OK)
5. Log tail 100 lines error:
   pm2 logs hmsdp-absenyura --err --nostream --lines 100
   sudo journalctl -u postgresql@16-main.service --since "10 minutes ago" --no-pager | tail -40
6. Public health https://your-domain.com/api/status → 200 curl code.
7. 1 user dummy TEST: scan QR hadir di session DummyTest. Row count bertambah 1.
8. Cek cron 1x: cron lifecycle run tepat next minute.
9. Backup DR FINAL 1x: sudo -u postgres bash deploy/scripts/backup.sh (upload ke bucket)
```

✅ **Semua parameter aman 1 jam**: Cutover RESMI SELESAI. Umumkan grup WA.
⚠️ **Ada spike error > 5%**: Lihat Rollback Plan.

---

## 🔴 ROLLBACK PLAN (Jika Step 6 FAIL KRITIS / Step 8 Spike 5xx > 5%)

Time target rollback: < 15 menit.

```
1. Revert DNS A-record domain Anda → KEMBALI ke IP Supabase / Vercel.
   Tunggu propagate 10-15 menit (DNS TTL 60 seharusnya cepat).
2. Re-enable write privileges Supabase di langkah STEP 1 reverse:
   GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
   ALTER ROLE authenticator RESET default_transaction_read_only;
3. Test user login + scan QR di Supabase existing → BERFUNGSI kembali.
4. Umumkan grup WA: "Rollback dilakukan, data kembali normal, cutover dijadwalkan ulang tanggal lain setelah investigasi."
5. Post-mortem 3 hari: analisis tiket FAIL step 6 apa? (biasanya extension pgcrypto tidak aktif saat restore UUID; atau timezone tidak Asia/Makassar → attendance time salah 8 jam).
```

---

## 📅 POST CUTOVER — 7 HARI MONITORING

| Hari | Action                                                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H+1  | Cek Row count User/Attendance/Session TIDAK BERUBAH dr cutover. Error log 5xx 0.                                                                                |
| H+2  | DR backup 6 jam 4x jalan. Terbukti 4 file upload bucket. SHA valid.                                                                                             |
| H+3  | Cron lifecycle 144x jalan. Tidak ada Session UPCOMING yang STUCK tidak jadi ACTIVE.                                                                             |
| H+7  | _Approve Go-Live Permanent_. Matikan project Supabase (atau simpan 30 hari untuk rollback darurat). Arsipkan dokumentasi cutover ke folder Google Drive HM SDP. |
