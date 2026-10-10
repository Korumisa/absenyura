# 🧰 11 — MAINTENANCE CHEATSHEET — HANYA 1 HALAMAN!

Print dan tempel di belakang monitor Admin Ops. TIDAK PERLU baca 8000 baris.

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

| #   | Task                                                                                   | Perintah                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Patch kernel + apt upgrade                                                             | `sudo apt update -y && sudo apt -y dist-upgrade` → jika ada kernel baru: `sudo reboot`                                                                                    |
| B2  | Certbot SSL auto-renew test                                                            | `sudo certbot renew --dry-run` — Harus "Congratulations, all simulated renewals succeeded"                                                                                |
| B3  | Analyze statistik Postgres Supabase (via SQL Editor)                                   | `ANALYZE public."Attendance", public."Session", public."ClassEnrollment";`                                                                                                |
| B4  | Capture 5 Query Lambat Supabase                                                        | SQL Editor Supabase: `SELECT query, calls, mean_exec_time, total_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;` → Copy paste ke Notepad laporan |
| B5  | ✅ **RESTORE TEST BACKUP (WAJIB — jika ini gagal berarti backup Anda tidak berguna!)** | `bash /var/www/hmsdp/repo/scripts/vps-restore-test.sh` → Expected exit 0 "Semua 6 tabel critical row count valid"                                                         |
| B6  | Rotasi INTERNAL_SECRET / JWT 1 (opsional, tapi disarankan tiap 6 bulan)                | Ganti `JWT_SECRET` + `JWT_REFRESH_SECRET` dengan random 64 chars baru → restart PM2 → Semua user harus login ulang                                                        |
| B7  | Audit UFW rules + SSH access log                                                       | `sudo ufw status numbered` + `sudo lastb \| head -5` (brute force gagal 5x → IP nya manual UFW deny)                                                                      |

---

## 🚨 EMERGENCY RESPONSE — 5 SKENARIO TERBURUK

### 🔴 E1: 502 BAD GATEWAY massal (10+ user lapor tidak bisa akses)

```bash
# Urutan periksa:
pm2 status                                          # app crash?
  └─ jika status errored → pm2 start ecosystem.config.js --env production
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
pm2 reload ecosystem.config.js --update-env
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
pm2 reload ecosystem.config.js --update-env
# EFEK: Semua user TERLOGUT secara paksa (keharusan demi keamanan).
```

---

### 🔴 E5: VPS NVMe MATI TOTAL (Hostinger node down / ransomware)

```bash
# RTO < 30 MENIT DARI BACKBLAZE B2 BACKUP.
# 1. Order VPS Hostinger BARU KVM 2 SG (ulangi step 01)
# 2. SSH VPS baru. Jalankan install_stack.sh (step 05)
# 3. RESTORE BACKUP TERAKHIR dari B2 ke Supabase (free tier juga bisa restore dari pg_dump)
#    Contoh perintah restore:
#    rclone ls b2remote:hmsdp-backup-free-uniku --max-age 24h
#    rclone copyto b2remote:hmsdp-backup-free-uniku/hmsdp-<TERBARU>.dump.gz /tmp/latest.dump.gz
#    pg_restore -d $DIRECT_URL --jobs 4 --clean --if-exists /tmp/latest.dump.gz
# 4. Ubah DNS A record Cloudflare dari IP lama → IP BARU (TTL 60s → propagasi < 2 menit)
# 5. User access normal kembali.
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
echo "=== (7) NGINX STATUS LATENCY 95th ==="; awk '{print $NF}' /var/log/nginx/hmsdp-access.log | sort -n | awk 'BEGIN{c=0} {a[c++]=$1} END{print "p95 latency:", a[int(c*0.95)], "ms, p99:", a[int(c*0.99)]}'
echo "=== (8) SYSTEMD FAILED UNITS ==="; systemctl --failed --no-pager
echo "=== (9) KERNEL OOM KILL TERBARU ==="; journalctl -k --grep -iE 'killed process|oom' --since "48 hours ago" | tail -10
echo "=== (10) PM2 ERROR COUNTER 24 JAM ==="; pm2 monit -n 5 2>/dev/null; pm2 jlist | grep -o '"pm_uptime":[0-9]*,"restart_time":[0-9]*'
```

Copy paste output 10 perintah ke tim teknis jika ada masalah yang tidak teridentifikasi. Tidak perlu kirim 100 screenshot error — 10 perintah ini cukup untuk 95% masalah.

---

### 🎉 **DEPLOYMENT HYBRID 500 USER = SELESAI. SELAMAT MENGGUNAKAN! 🎊**

Folder ini = referensi lengkap jika nanti ada staf baru Infokom HMJ yang接管 operasional sistem. Tinggal baca 00_README → ikuti 01→11 berurutan.
