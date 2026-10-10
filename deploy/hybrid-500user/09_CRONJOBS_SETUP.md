# ⏰ 09 — CRON JOBS: 5 LIFECYCLE APP + BACKUP + CLEANUP

Estimasi: 10 menit.

---

## A. CRONJOBS USER DEPLOY (App Lifecycle + Backup)

Login user deploy:

```bash
su - deploy
crontab -e
# Pilih 1 /bin/nano jika diminta.
```

> **Job aplikasi TIDAK perlu crontab.** Di VPS, `dist-server/server.js` menjalankan
> `startCronJobs()` di dalam proses PM2: buka/tutup sesi + auto-Alfa tiap 1 menit,
> cleanup nonce 00:00, cleanup foto >7 hari 02:00, update semester 01:00 (zona waktu server).
> Karena itu PM2 WAJIB `instances: 1` — lebih dari 1 proses = job jalan dobel.
> Cek di log: `pm2 logs hmsdp-absenyura --lines 50 | grep Cron`.
>
> Setelah cutover dari Vercel, hapus/biarkan mati project Vercel agar Vercel Cron
> (`/api/cron/trigger?job=daily`) tidak ikut jalan terhadap database yang sama.

Crontab user deploy hanya untuk backup + rotasi log.
Paste baris di BAWAH komentar `# m h dom mon dow command` di akhir file.
⚠️ **GANTI `/var/www/hmsdp/repo` dengan PATH REPO ANDA** (jika berbeda).

```bash
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin:/home/deploy/.local/bin:/sbin:/usr/sbin

# ================================================================
# BACKUP SEKUNDER PG_DUMP SUPABASE ke Backblaze B2 via rclone
# Jalankan tiap 6 JAM (00:00, 06:00, 12:00, 18:00 WITA/SG)
# ================================================================
0 */6 * * * /usr/bin/bash /var/www/hmsdp/repo/scripts/vps-backup.sh >> /var/www/hmsdp/logs/cron-backup.log 2>&1

# ================================================================
# ROTASI LOG CRON 7 HARI (hapus log cron > 7 hari supaya disk tidak bengkak)
# ================================================================
0 3 * * 0 /usr/bin/find /var/www/hmsdp/logs -name 'cron-*.log' -type f -mtime +7 -delete
```

Simpan: Ctrl+O Enter, keluar Ctrl+X.

Verifikasi crontab terpasang:

```bash
crontab -l
# Harus muncul 2 baris: backup tiap 6 jam + rotasi log mingguan.
```

---

## B. PASTIKAN FOLDER LOG ADA

```bash
mkdir -p /var/www/hmsdp/logs
chown deploy:deploy /var/www/hmsdp/logs
```

---

## C. TEST

```bash
# Job aplikasi: tunggu 1-2 menit setelah pm2 start, harus muncul baris "[Cron] Starting session status updater".
pm2 logs hmsdp-absenyura --lines 100 --nostream | grep Cron

# Backup: jalankan manual sekali, harus exit code 0.
bash /var/www/hmsdp/repo/scripts/vps-backup.sh; echo "exit=$?"
```

---

## D. CRON SUPABASE WEEKLY — SUDAH DI-SETUP DI STEP 02!

Step 02 `02_SUPABASE_OPTIMIZE.sql` bagian bawah = Supabase Dashboard → Database → Cron Jobs.
Pastikan sudah ada:

```
Name    : Weekly Cleanup Log Retention
Schedule: Senin 02:00 GMT (09:00 WITA)
```

Kalau belum → balik ke 02_SUPABASE_OPTIMIZE.sql bagian paling bawah → buat cron.

---

### ✅ **SELESAI. LANJUT KE [10_SMOKE_TEST.md](10_SMOKE_TEST.md) — 20 TIKET FINAL SEBELUM UMUMKAN KE USER.**
