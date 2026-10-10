# 🧰 OPERASIONAL — CHEATSHEET 1 HALAMAN

Untuk mode VPS + Supabase. Update rutin & rollback: lihat juga [README.md](README.md) bagian "Update aplikasi".
Mode full self-host (Postgres di VPS): [selfhost/OPERATIONS.md](selfhost/OPERATIONS.md).

---

## 📅 HARIAN (2 Menit, Jam 06:30 WITA sebelum absen pagi mulai)

| #   | Perintah                                       | Artinya                      | Stop jika?                                                |
| --- | ---------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| 1   | `df -hT / /var/www`                            | Cek sisa disk NVMe           | ⚠️ Used > 80% → hapus backup lama / log                   |
| 2   | `free -h`                                      | Cek RAM + Swap               | ⚠️ Swap > 1 GB digunakan → cek PM2 memory leak            |
| 3   | `pm2 status`                                   | App sehat?                   | ❌ Status errored / restart > 2x → `pm2 logs --lines 100` |
| 4   | `tail -10 /var/www/hmsdp/logs/cron-backup.log` | Backup 6 jam lalu sukses?    | ❌ Ada `[FAIL]` → run manual backup script                |
| 5   | `uptime && sudo systemctl --failed`            | Load average + service gagal | ❌ Load > 4 (2 vCPU 2x overload) → ada loop tak terbatas  |

---

## 📅 BULANAN (Jam 19:00 WITA Malam Sabtu tanggal 1)

| #   | Task                                                                            | Perintah                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Patch kernel + apt upgrade                                                      | `sudo apt update -y && sudo apt -y dist-upgrade` → jika ada kernel baru: `sudo reboot`                                                                                    |
| B2  | Certbot SSL auto-renew test                                                     | `sudo certbot renew --dry-run` — Harus "Congratulations, all simulated renewals succeeded"                                                                                |
| B3  | Analyze statistik Postgres Supabase (via SQL Editor)                            | `ANALYZE public."Attendance", public."Session", public."ClassEnrollment";`                                                                                                |
| B4  | Capture 5 Query Lambat Supabase                                                 | SQL Editor Supabase: `SELECT query, calls, mean_exec_time, total_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;` → Copy paste ke Notepad laporan |
| B5  | ✅ **UJI BACKUP (WAJIB — backup yang tidak bisa dibaca = tidak punya backup!)** | Lihat bagian "Uji backup" di bawah                                                                                                                                        |
| B6  | Rotasi INTERNAL_SECRET / JWT 1 (opsional, tapi disarankan tiap 6 bulan)         | Ganti `JWT_SECRET` + `JWT_REFRESH_SECRET` dengan random 64 chars baru → restart PM2 → Semua user harus login ulang                                                        |
| B7  | Audit UFW rules + SSH access log                                                | `sudo ufw status numbered` + `sudo lastb \| head -5` (brute force gagal 5x → IP nya manual UFW deny)                                                                      |

---

## 🧪 Uji backup (bulanan)

VPS mode ini hanya punya `pg_dump`/`pg_restore` client (tanpa server Postgres), jadi uji di VPS =
integritas file + isi arsip. `deploy/scripts/restore-test.sh` khusus mode self-host.

```bash
R=b2remote:hmsdp-backup/hmsdp-db-backups        # = BACKUP_RCLONE_REMOTE:BACKUP_RCLONE_PATH di .env
F=$(rclone lsf "$R" --include 'hmsdp-*.dump' | sort | tail -1); echo "$F"
rclone copyto "$R/$F" "/tmp/$F" && rclone copyto "$R/$F.sha256" "/tmp/$F.sha256"
[ "$(sha256sum "/tmp/$F" | cut -d' ' -f1)" = "$(cat "/tmp/$F.sha256")" ] && echo "SHA OK"
pg_restore -l "/tmp/$F" | grep -cE 'TABLE DATA public "?(User|Session|Attendance)"? '   # harus 3
rm -f "/tmp/$F" "/tmp/$F.sha256"
```

Restore penuh (2-3 bulan sekali): unduh file yang sama ke laptop, lalu
`docker run -d --name pgtest -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:17` →
`pg_restore -d postgresql://postgres:x@localhost:5433/postgres --no-owner --no-privileges FILE.dump` →
cek jumlah baris `User`/`Attendance` masuk akal → `docker rm -f pgtest`.

---

## 🚨 EMERGENCY RESPONSE — 5 SKENARIO TERBURUK

### 🔴 E1: 502 BAD GATEWAY massal (10+ user lapor tidak bisa akses)

```bash
# Urutan periksa:
pm2 status                                          # app crash?
  └─ jika status errored → pm2 start ecosystem.config.cjs --env production
  └─ jika restart terus → pm2 logs --lines 200 | tail -100 → copy paste error
curl -s http://127.0.0.1:3001/api/status             # Node bisa diakses internal? (503 = DB/Supabase bermasalah)
  └─ jika OK tapi HTTPS 502 → nginx -t → systemctl restart nginx
systemctl is-active nginx                            # service jalan?
free -h                                              # OOM? swap penuh?
  └─ jika OOM log ada: journalctl -k --grep -i 'out of memory' → tambah swapfile
```

⏱️ ETA Perbaiki: < 10 menit.

---

### 🔴 E2: SERVER 500 ERROR SETELAH UPDATE CODE (deploy baru ada bug)

```bash
# ROLLBACK 1 COMMIT SEBELUMNYA (ZERO DOWNTIME PM2):
cd /var/www/hmsdp/repo
git stash   # simpan perubahan lokal kalau ada
git log --oneline -5    # copy commit hash TERATAS yang BERKERJA (2 commit lalu)
git reset --hard <COMMIT_HASH_YANG_MASIH_NORMAL>
npm ci
npm run build:vps
pm2 reload ecosystem.config.cjs --update-env
pm2 status     # harus online
# POST ROLLBACK: Lapor ke tim dev bahwa HEAD ada bug.
```

⏱️ ETA Rollback: < 2 menit.

---

### 🔴 E3: DISK FULL 100% — OOPs ada log 50 GB!

```bash
# Temukan file ukuran RAKSASA:
ncdu /
# Biasanya = file log nginx / backup dump lama / uploads foto tanpa Cloudinary:
#   delete: rm /var/log/nginx/*.1.gz /var/www/hmsdp/logs/*.log.big
#   uploads terlalu besar → pindahkan 1-by-1 ke Cloudinary via script bulk upload
# Setelah bersih → reboot: systemctl reboot (karena inode cache penuh)
```

---

### 🔴 E4: LUPA / KEBOCORAN SECRET INTERNAL_SECRET

```bash
# Segera regenerate secret baru:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
nano /var/www/hmsdp/.env
# → ganti INTERNAL_SECRET, JWT_SECRET, JWT_REFRESH_SECRET, ATTENDANCE_PROOF_SECRET, CRON_SECRET, SEED_SECRET
# Restart app:
pm2 reload ecosystem.config.cjs --update-env
# EFEK: Semua user TERLOGUT secara paksa (keharusan demi keamanan).
```

---

### 🔴 E5: VPS NVMe MATI TOTAL (Hostinger node down / ransomware)

```bash
# Data absensi ada di Supabase → VPS mati TIDAK berarti data hilang. RTO ± 1 jam.
# 1. Order VPS Hostinger BARU KVM 2 SG (README langkah 1)
# 2. Ulangi README langkah 3-8 (.env: salin dari password manager / VPS lama)
# 3. Ubah DNS A record dari IP lama → IP BARU
# 4. Foto lokal di ./uploads hilang jika CLOUDINARY_URL tidak diisi — alasan Cloudinary wajib.
#
# Jika yang rusak DATA SUPABASE (bukan VPS): restore dump terakhir dari B2:
#    R=b2remote:hmsdp-backup/hmsdp-db-backups
#    F=$(rclone lsf "$R" --include 'hmsdp-*.dump' | sort | tail -1)
#    rclone copyto "$R/$F" "/tmp/$F"
#    pm2 stop hmsdp-absenyura
#    pg_restore -d "$DIRECT_URL" --no-owner --no-privileges --clean --if-exists "/tmp/$F"
#    pm2 start hmsdp-absenyura
```

---

## 🏃 2-MIN PERFORMANCE DIAGNOSTIC KIT (KETIK 10 PERINTAH INI → KETAHUI MASALAH DALAM 2 MENIT)

```bash
echo "=== (1) CPU/RAM LOAD ==="; htop -n 1 -d 10 | head -20
echo "=== (2) DISK I/O ==="; iostat -xz 1 1 | grep -E 'Device|nvme'
echo "=== (3) INODE PENUH? ==="; df -i / /var/www
echo "=== (4) NETWORK CONNECTIONS ==="; ss -s
echo "=== (5) 5 QUERY PALING LAMBAT (via Supabase pg_stat_statements copy) ==="
echo "   Buka Supabase SQL → top 5 mean_exec_time desc → copy paste"
echo "=== (6) TABLE BLOAT > 20% ? ==="
echo "   Buka Supabase SQL Editor → run: SELECT schemaname, tablename, dead_tuple_pct FROM pg_stat_user_tables ORDER BY dead_tuple_pct DESC LIMIT 5;"
echo "=== (7) NGINX 5xx HARI INI ==="; awk '$9 ~ /^5/' /var/log/nginx/hmsdp-access.log | wc -l
echo "=== (8) SYSTEMD FAILED UNITS ==="; systemctl --failed --no-pager
echo "=== (9) KERNEL OOM KILL TERBARU ==="; journalctl -k --grep -iE 'killed process|oom' --since "48 hours ago" | tail -10
echo "=== (10) PM2 ERROR COUNTER 24 JAM ==="; pm2 jlist | grep -o '"pm_uptime":[0-9]*,"restart_time":[0-9]*'
```

Copy paste output 10 perintah ke tim teknis jika ada masalah yang tidak teridentifikasi. Tidak perlu kirim 100 screenshot error — 10 perintah ini cukup untuk 95% masalah.

---

Staf baru Infokom HMJ yang mengambil alih operasional: baca [README.md](README.md) dari atas, lalu file ini.
