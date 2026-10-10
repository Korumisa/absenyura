# VPS DUAL PURPOSE — Operasional Playbook (Harian + 30 Hari + Darurat)

> **Dokumen ini untuk Operator Admin HM SDP (mahasiswa Infokom, bukan sysadmin senior).**
> Setiap perintah di-copy paste, diikuti verifikasi output expected-nya. JANGAN ubah parameter tanpa catatan di log operasional.
> **Log Operasional**: Setiap tindakan, catat di spreadsheet / notion: `Tanggal | Waktu | Tindakan | Operator | Hasil Output | Screenshot`.

---

## 📋 Bagian A. Check List Operator HARIAN (5 menit, setiap pagi JAM 06:30 WITA — sebelum jam absen)

Jalankan semua perintah ini via ssh `deploy@IP-VPS`. Status ☐ → ☑ jika hasil PASS.

```bash
# 1. App PM2 status: process online, uptime > 24 jam, restart = 0
pm2 status hmsdp-absenyura
#   Expected column: status = online, restarts = 0, uptime > 1d

# 2. Postgres + PgBouncer running OK
sudo pg_isready
sudo systemctl is-active pgbouncer
#   Expected: accepting connections + active

# 3. Disk space < 85% (jika melebihi → segera bersihkan logs / foto lama)
df -h / | tail -1
df -h /var/lib/postgresql | tail -1
du -sh /var/lib/hmsdp-persistent/uploads 2>/dev/null
#   Expected: Use% < 85%

# 4. Inode usage (bahaya ENOSPC inode saat node_modules kecil banyak):
df -i / | tail -1
#   Expected: IUse% < 50%

# 5. Last 24 jam PM2 error count:
pm2 logs hmsdp-absenyura --nostream --lines 100 --err | grep -c 'Error\|FATAL'
#   Expected: 0. Jika > 0 → copy error lines, open tiket perbaikan

# 6. Nginx error log 499/500 count last 24 jam:
sudo awk '$0 >= from {print}' from="$(date -d 'yesterday' '+%Y-%m-%d')" /var/log/nginx/error.log 2>/dev/null | grep -cE ' 50[0-9] '
#   Expected: 0

# 7. Cron jobs 24 jam terakhir BERJALAN (backup + lifecycle):
echo "=== Last backups ===" ; rclone ls b2remote:$(grep BACKUP_RCLONE_PATH .env | cut -d= -f2) | tail -10
echo "=== Cron lifecycle status ===" ; tail -5 /var/log/hmsdp/cron-lifecycle.log
```

✅ **7 PASS** → status OK, tidak perlu tindakan lanjut.
❌ **SATU PUN FAIL** → copy paste errornya, langsung masuk Bagian D (Emergency).

---

## 📅 Bagian B. Maintenance MONTHLY (tiap tanggal 1, 1-2 jam kerja)

Checklist ini selesai dalam 2 jam. Jadwalkan tanggal 1 jam 19:00 WITA (luar jam kuliah / absen).

```bash
# =============================================================================
# B1. Upgrade OS Security Patch
# =============================================================================
sudo apt update
sudo apt list --upgradable 2>/dev/null | wc -l
#   Jika >10 package → jalankan upgrade. Jika kernel reboot schedule maintenance 5 menit.
sudo apt upgrade -y
sudo apt autoremove -y && sudo apt autoclean
# ⚠️ Setelah upgrade kernel: need-reboot
if [ -f /var/run/reboot-required ]; then
  echo "NEED REBOOT — schedule 10 menit downtime user!"; sudo shutdown -r +5 "Reboot scheduled kernel patch";
fi

# =============================================================================
# B2. Certbot SSL Dry-Run + renew (jika mau expire < 30 hari)
# =============================================================================
sudo certbot renew --dry-run
#   Expected: dry run success. JIKA FAIL → cek DNS domain + rule ufw 80.

# =============================================================================
# B3. PostgreSQL Maintenance: VACUUM ANALYZE + REINDEX concurrently
# =============================================================================
# 3a. Check bloat table attendance (20%+ bloat = butuh vacuum full)
sudo -u postgres psql hmsdp <<'EOSQL'
-- Bloat report (pgstattuple simple) — estimasi:
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  n_dead_tup AS dead_rows, n_live_tup AS live_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 15;
EOSQL

# 3b. Global VACUUM ANALYZE verbose
sudo -u postgres psql -d hmsdp -c "VACUUM (ANALYZE, VERBOSE, INDEX_CLEANUP ON);"
# Duration: 3-15 menit untuk 100k rows. BISA dijalankan SELAMA user aktif (tidak lock table).

# 3c. Reindex CONCURRENTLY (tidak lock DML) untuk index besar (> 500 MB)
sudo -u postgres psql -d hmsdp -c "REINDEX (VERBOSE) TABLE CONCURRENTLY public.\"Attendance\";"
sudo -u postgres psql -d hmsdp -c "REINDEX (VERBOSE) TABLE CONCURRENTLY public.\"Session\";"
sudo -u postgres psql -d hmsdp -c "REINDEX (VERBOSE) TABLE CONCURRENTLY public.\"User\";"

# 3d. Check pg_stat_statements top 5 query lambat:
sudo -u postgres psql -d hmsdp <<'EOSQL'
SELECT ROUND(total_exec_time::numeric, 1) AS total_ms, calls,
       ROUND(mean_exec_time::numeric, 2) AS mean_ms,
       ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
       LEFT(query, 100) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 5;
EOSQL
#   Catat top query ke spreadsheet jika mean_ms > 500ms (target optimisasi bulan depan).

# =============================================================================
# B4. TEST RESTORE BACKUP TERBARU (PENTING — backup tanpa restore = tidak punya backup)
# =============================================================================
sudo -u postgres bash /var/www/hmsdp/scripts/vps-restore-test.sh
tail -100 /var/log/hmsdp/restore-test.log | tail -20
# ✅ Expected exit code 0 + final line: "✅ RESTORE TEST LULUS"
# ❌ Jika FAIL: segera investigasi + kirim tiket. Data absensi Anda BERESIKO.

# =============================================================================
# B5. Rotasi Secrets (opsional — direkomendasikan jika ada staf Infokom resign)
# =============================================================================
# Generate baru 6 random secret:
for i in 1 2 3 4 5 6; do node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; done
# Edit .env, ganti JWT_SECRET, JWT_REFRESH_SECRET, ATTENDANCE_PROOF_SECRET, SEED_SECRET, INTERNAL_SECRET, CRON_SECRET
# Restart app + re-login semua user:
pm2 reload ecosystem.config.js --update-env
# Update crontab X-Cron-Secret line dengan value CRON_SECRET BARU.
crontab -e

# =============================================================================
# B6. UFW audit ruleset (pastikan tidak ada rule ilegal port 5432)
# =============================================================================
sudo ufw status numbered
#   HANYA port 22 limit, 80, 443 + loopback. Port lain DENY / 5432 TIDAK ADA.

# =============================================================================
# B7. Prisma Migration Schema Diff Check — untuk audit drift manual
# =============================================================================
cd /var/www/hmsdp && npx prisma@6.4.1 migrate status
#   Expected: "All migrations applied successfully"
#   Jika ada failed → jangan deploy sampai fixed!
```

---

## 🔄 Bagian C. Redeploy + Rollback Code (Hotfix / Feature)

### C1. Zero-Downtime Redeploy — 1 Liner (Paling Sering Dipakai)

```bash
cd /var/www/hmsdp
bash -c 'set -e; git pull origin main --ff-only; \
         NODE_ENV=development npm ci; \
         npx prisma@6.4.1 migrate deploy; \
         npm run build:vps; \
         pm2 reload ecosystem.config.js --update-env; \
         sleep 3; \
         pm2 status hmsdp-absenyura; \
         curl -s -o /dev/null -w "Health HTTP %{http_code}\n" https://YOUR-DOMAIN.COM/api/status'
# ✅ Final line: Health HTTP 200.
# ❌ Jika step MANA PUN gagal (exit != 0): STOP, jalankan C2 ROLLBACK 1 commit.
```

### C2. Rollback 1 Commit ke Belakang (Hotfix gagal / user 502)

```bash
cd /var/www/hmsdp
# 1. Log last commit untuk lihat target rollback ke
git log -1 --oneline HEAD~1
# 2. Hard reset ke commit 1 langkah belakang:
git reset --hard HEAD~1
# 3. Re-run full build pipeline:
npm ci --omit=dev && npx prisma@6.4.1 migrate resolve --rolled-back 2>/dev/null || true
# 4. Jika migration reverse susah: revert manual ke migration terakhir yang BERHASIL
npx prisma@6.4.1 migrate deploy
npm run build:vps && pm2 reload ecosystem.config.js
pm2 status hmsdp-absenyura | head -5
```

### C3. Emergency Feature Flag Off Global — Mode Maintenance (jika app error parah, tapi tidak mau restart)

```bash
# Setting temporary return 503 maintenance page dari Nginx level (tanpa Node.js ON):
# TAMBAHKAN baris DI ATAS location /api di /etc/nginx/sites-enabled/hmsdp.conf:
cat > /tmp/maintenance.html <<'EOF'
<html><head><title>Maintenance 10 Menit</title></head>
<body style="font-family:sans-serif;padding:4rem;text-align:center">
<h1>🛠️ Sistem sedang Maintenance Singkat</h1>
<p>Sabar ya, sekitar 5-10 menit lagi normal kembali. Info lebih lanjut cek grup WA HM SDP.</p>
</body></html>
EOF
sudo cp /tmp/maintenance.html /var/www/hmsdp/dist/maintenance.html
# Di location / { ... } baris pertama tambahkan: return 503; error_page 503 /maintenance.html;
sudo nginx -t && sudo systemctl reload nginx
# Setelah selesai perbaikan: hapus return 503, reload, rm maintenance.html
```

---

## 🚨 Bagian D. Emergency Response Manual (Incident Response)

Prioritas: **1. Selamatkan Data DB dulu.** Baru restore app.

### D1. Scenario: Semua user Lihat 502 Bad Gateway / 500 Massal

Time budget: < 5 menit untuk response awal.

```bash
# 1. Check culprit: PM2 / Postgres mati?
pm2 status hmsdp-absenyura && sudo systemctl status postgresql@16-main --no-pager -l | head -20
# 2a. Jika Postgres status failed:
sudo journalctl -u postgresql@16-main --since "15 min ago" --no-pager | tail -40
#    Paling umum: OOM kill. Fix: kurangi max-old-space-size Node.js jadi 1280, restart.
sudo systemctl restart postgresql@16-main.service ; sleep 3 ; pm2 restart hmsdp-absenyura
# 2b. Jika PM2 app crash loop (restart > 5x dalam 10 menit):
pm2 logs hmsdp-absenyura --err --lines 100 --nostream | tail -60
#    Kalau tidak sempat baca → ROLLBACK ke commit bagus terakhir (Bagian C2).
```

### D2. Scenario: DB OOM Kill Kernel — Postgres Crash Loop 2-5x / hari

```bash
# Root cause: Node.js makan RAM terlalu banyak saat npm ci / build + Postgres kena kill.
# Fix permanen:
# 1. Naikin swap dari 3G → 6G
sudo swapoff /swapfile; sudo rm /swapfile; sudo fallocate -l 6G /swapfile
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && swapon --show
# 2. Kurangi PM2 max_memory_restart jadi 1200M:
#    ecosystem.config.js: max_memory_restart: '1200M' ; node_args --max-old-space-size=1280
# 3. Tambahkan cron restart app 1x per hari JAM 3 PAGI (clean leak ringan):
crontab -e | sed '/^# CUSTOM/i 0 3 * * * cd /var/www/hmsdp && pm2 reload hmsdp-absenyura >> /var/log/hmsdp/cron-reload.log 2>&1'
```

### D3. Scenario: Disk Full (>95%) — Postgres Cannot Write WAL (PANIC: could not write to file)

```bash
# 1. Identifikasi siapa yang makan space TERBESAR:
sudo du -xh --max-depth=2 / /var/lib/postgresql /var/lib/hmsdp-persistent /var/log 2>/dev/null | sort -h | tail -30
# 2. Bersihkan yang AMAN dihapus:
sudo journalctl --vacuum-time=7d              # systemd journal > 7 hari
sudo apt clean && sudo apt autoremove -y
cd /var/log/hmsdp; sudo find . -name "*.log.*.gz" -mtime +7 -delete
# 3. Jika ./uploads foto: hapus foto > 30 hari (jika CLOUDINARY_URL sudah OK):
find uploads/attendance uploads/excuses -type f -mtime +30 -print -delete 2>/dev/null
# 4. Jika Postgres WAL folder membengkak:
sudo -u postgres psql -c "CHECKPOINT; SELECT pg_switch_wal();"   # trigger checkpoint manual → recycle WAL
# 5. Jika wal_level=replica archive_mode on tapi archive command fail → matikan archive_mode di postgresql.conf jika tidak ada slave.
```

### D4. Scenario: Lupa INTERNAL_SECRET → semua session user TIDAK VALID / login 401

```bash
# BISA DIJALANKAN TANPA HILANGKAN DATA ATTENDANCE (tidak DB drop).
# Regenerate INTERNAL_SECRET + CRON_SECRET baru 32 byte hex.
# Edit .env replace semua 6 slot secret.
# Restart Postgres + App (invalidate cache):
sudo systemctl restart postgresql@16-main
pm2 restart hmsdp-absenyura --update-env
# Update crontab line CRON_SECRET juga (jika pakai).
# Dampak: Semua user harus LOGIN ULANG (refresh_token jadi tidak valid). Kirim pengumuman grup WA 1x.
```

### D5. Scenario: _WORST CASE_ — NVMe VPS Hostinger TOTAL RUSAK / server hacked → RTO < 30 menit

_Data integrity PRIORITAS NO 1._

```bash
# ============================================================================
# LANGKAH 1 — BUKA PANIK MODE (5 menit)
# ============================================================================
# 1a. Jika masih bisa SSH 1x terakhir:
#     - Dump DB terakhir, simpan ke laptop lokal IMMEDIATELY:
sudo -u postgres pg_dump -Fc hmsdp | gzip > /tmp/hmsdp-EMERGENCY-$(date +%Y%m%d-%H%M).dump.gz
#     - Download via scp ke laptop: scp deploy@IP:/tmp/hmsdp-EMERGENCY-*.dump.gz ./
# 1b. Jika tidak bisa SSH sama sekali:
#     - Ambil BACKUP TERBARU dari object storage B2/R2:
#       rclone copy b2remote:BUCKET/hmsdp-db-backups/ ./last-backup --max-age 24h

# ============================================================================
# LANGKAH 2 — ORDER VPS BARU Hostinger KVM 2 SG (15 menit) + DOMAIN A record ke BARU
# ============================================================================
#    Pastikan IP VPS BARU terkonfirmasi bisa SSH.

# ============================================================================
# LANGKAH 3 — FOLLOW PANDUAN DEPLOY_VPS_DUAL_HOSTINGER.md DARI STEP 0 SAMPAI STEP 8
# ============================================================================
#    STOP di STEP 6.3 migrate deploy → JANGAN SEED. Instead:
#    RESTORE DARI BACKUP tadi ke VPS BARU:
sudo -u postgres pg_restore -d hmsdp --no-owner --jobs=2 ./last-backup/*.dump.gz

# ============================================================================
# LANGKAH 4 — CHANGE DNS A RECORD domain ke IP BARU. Tunggu DNS propagate 15 mnt.
# ============================================================================
```

---

## 📊 Bagian E. 2-Min Quick Performance Diagnose Dashboard (10 Perintah)

Setiap user lapor "lambat" — jalankan 10 perintah ini BERURUTAN. Copy semua output, paste ke tiket support:

```bash
# E1. Top CPU + Memory process (siapa makan resource)
htop -u deploy,postgres,www-data  # F6 sort %CPU → q exit
# Alternatif non-interactive:
ps aux --sort=-%mem | head -15 ; echo "---"; ps aux --sort=-%cpu | head -15

# E2. Disk I/O wait (%) — tinggi > 20% = I/O bottleneck Postgres WAL vs Uploads
iostat -xz 1 3 | tail -30

# E3. Inode usage (ENOSPC hidden):
df -i / ; df -i /var/lib/postgresql

# E4. Network connection count: CLOSE_WAIT leak?
ss -s ; echo "ESTABLISHED count:"; ss -ant | grep ESTAB | wc -l

# E5. Slow query > 1 detik saat ini (pg_stat_activity):
sudo -u postgres psql -c "SELECT pid, age(clock_timestamp(), query_start), usename, wait_event_type, wait_event, state, LEFT(query, 120) AS q FROM pg_stat_activity WHERE state != 'idle' ORDER BY age DESC LIMIT 10;"

# E6. Postgres DB size top 15 tables + indexes:
sudo -u postgres psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) total FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 15;"

# E7. Prisma Pool active/idle status:
pm2 logs hmsdp-absenyura --nostream --lines 200 | grep -iE 'pool|P2024|timeout' | tail -20

# E8. Nginx upstream response time bucket (latency app):
sudo awk '{print $NF}' /var/log/nginx/access.log 2>/dev/null | sort -n | awk 'END{print "count="NR, " p50="NR*0.5"th value, p95="NR*0.95"th, p99="NR*0.99"th"}'
#   (lebih akurat pakai artillery jika butuh)

# E9. Systemd failed unit list:
sudo systemctl --failed --no-pager

# E10. Kernel OOM log (jika process kena Kill):
sudo journalctl -k --since "24 hours ago" | grep -i oom | tail -10
sudo dmesg -T 2>/dev/null | grep -iE 'out of memory|killed process' | tail -5
```

---

## 📝 Catatan Akhir Operasional

1. **Jangan Pernah Edit File Production Tanpa Snapshot**: Setiap mau ubah config nginx / postgresql / env → `cp file file.bak.$(date +%s)` DULU.
2. **Jalankan semua deploy di maintenance window (Jumat 19:00 - 21:00 WITA)** — bukan hari Senin pagi sebelum jam absen.
3. **Simpan dokumen ini + deploy checklist printout fisik** di lemari Arsip HM SDP (untuk kader Infokom tahun depan).
4. **Setiap ganti kepanitiaan → pass over 3 item utama**: (a) akses SSH deploy user + sudo, (b) semua 6 secret + DB password + Cloudinary, (c) URL rclone object storage backups + credentials.
