# VPS DUAL PURPOSE — 50-ITEM PRELAUNCH AUDIT CHECKLIST (PRINTABLE)

---

> **Periode Audit**: Tanggal **_/_**/2026 — Waktu: \_**\_:\_\_** WITA
> **Operator (Nama / NIM)**: ************\_\_\_\_************ Jabatan: ********\_\_********
> **Reviewer (PIC / Ketua HMJ)**: **********\_\_\_\_********** Jabatan: ********\_\_********
>
> **Cara Pengisian**:
> ✅ = PASS, ❌ = FAIL, ⚠️ = WARN (ada catatan).
> **SATU PUN FAIL → JANGAN GO-LIVE.** Perbaiki dulu, baru isi tanggal sign-off.
>
> **Target PASS RATIO ≥ 48/50** (2 WARN maksimal boleh).

---

## BAGIAN 1 — INFRASTRUKTUR VPS (ITEM 1-10)

| #   | Verifikasi                                                                   | Evidence / Cara Cek                                             | Status ☐ | Catatan |
| --- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- | ------- |
| 1   | Order Hostinger KVM 2 REGION SINGAPURA (bukan US/EU). IP publik VPS dikenal. | Dashboard Hostinger                                             | ☐        |         |
| 2   | Kernel Ubuntu minimal 5.15, OS 22.04 LTS x86_64.                             | `cat /etc/os-release` + `uname -r`                              | ☐        |         |
| 3   | RAM ≥ 8 GB, swapfile 3 GB aktif.                                             | `free -h` + `swapon --show`                                     | ☐        |         |
| 4   | Disk root NVMe free ≥ 50 GB, inode IUse% < 50%.                              | `df -h /` + `df -i /`                                           | ☐        |         |
| 5   | vCPU = 2. Model CPU bukan lama (Tidak kurang dari Xeon Silver / EPYC Milan). | `lscpu`                                                         | ☐        |         |
| 6   | A record domain + www.domain point ke IP VPS. NSlookup dari ISP RUMAH.       | `dig A +short your-domain.com @8.8.8.8`                         | ☐        |         |
| 7   | Transparent Huge Pages (THP) = never.                                        | `cat /sys/kernel/mm/transparent_hugepage/enabled`               | ☐        |         |
| 8   | `vm.swappiness=1`, shared_buffers 2 GB diset di sysctl.                      | `sysctl vm.swappiness vm.dirty_ratio vm.dirty_background_ratio` | ☐        |         |
| 9   | User `deploy` sudoers NOPASSWD. SSH root bisa di nonaktifkan nanti.          | `cat /etc/sudoers.d/deploy`                                     | ☐        |         |
| 10  | Script `vps-preflight.sh` di-run, output 0 FAIL.                             | Exit code = 0                                                   | ☐        |         |

---

## BAGIAN 2 — KEAMANAN FIREWALL + POSTGRES (ITEM 11-20)

| #   | Verifikasi                                                                               | Evidence / Cara Cek                                       | Status ☐        | Catatan |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------- | ------- | --- |
| 11  | UFW AKTIF. Allow hanya 22/limit, 80, 443. Port lain DENY DEFAULT.                        | `sudo ufw status numbered verbose`                        | ☐               |         |
| 12  | nmap SCAN dari EKSTERNAL (bukan dari VPS): HANYA 22,80,443 open. 5432/6432/3001 DROPPED. | `nmap -Pn -p- VPS_IP` (dari laptop rumah)                 | ☐               |         |
| 13  | Postgres LISTEN HANYA 127.0.0.1:5432 (bukan 0.0.0.0).                                    | `ss -tlnp                                                 | grep postgres`  | ☐       |     |
| 14  | pg_hba.conf REJECT 0.0.0.0/0. hmsdp_app hanya dari loopback + socket local.              | `cat /etc/postgresql/16/main/pg_hba.conf                  | tail -20`       | ☐       |     |
| 15  | Systemd drop-in Postgres OOMScoreAdjust = -900.                                          | `systemctl cat postgresql@16-main                         | grep OOM`       | ☐       |     |
| 16  | Role hmsdp_app = NOSUPERUSER NOCREATEDB NOCREATEROLE. BUKAN superuser.                   | `\du hmsdp_app` di psql                                   | ☐               |         |
| 17  | Password encryption = scram-sha-256.                                                     | `psql -c "SHOW password_encryption;"`                     | ☐               |         |
| 18  | PgBouncer jalan di port 127.0.0.1:6432. `pool_mode = transaction`.                       | `grep pool_mode /etc/pgbouncer/pgbouncer.ini` + `ss -tlnp | grep pgbouncer` | ☐       |     |
| 19  | .env production CHMOD 600, owner deploy:deploy. Tidak di-commit git.                     | `ls -la .env` + `git status .env` (harus ignored)         | ☐               |         |
| 20  | 6 Secret slot di .env PANJANG 64 karakter hex (32 byte). BUKA default "change_me".       | `awk -F= '/^JWT_SECRET/ {print length($2)}' .env` = 64    | ☐               |         |

---

## BAGIAN 3 — RUNTIME & BUILD PIPELINE (ITEM 21-30)

| #   | Verifikasi                                                                              | Evidence / Cara Cek                                                | Status ☐      | Catatan |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------- | ------- | --- |
| 21  | Node.js 22 LTS, npm 10. Engines package.json terpenuhi.                                 | `node -v && npm -v`                                                | ☐             |         |
| 22  | PM2 Global install. `pm2 startup systemd` dijalankan. Autostart boot OK.                | `systemctl is-active pm2-deploy`                                   | ☐             |         |
| 23  | Nginx ter-install, systemd enable — now.                                                | `nginx -v` + `systemctl is-active nginx`                           | ☐             |         |
| 24  | Certbot SSL — sertifikat Let's Encrypt berlaku > 60 hari. Grade A di SSLLabs.           | `sudo certbot certificates` + ssllabs report                       | ☐             |         |
| 25  | `npm ci --omit=dev` exit 0. Tidak ada native module sharp/@node-rs/bcrypt fail compile. | Build log 0 error.                                                 | ☐             |         |
| 26  | `npx prisma migrate deploy` exit 0. SEMUA migration APPLIED. No pending.                | `npx prisma migrate status` — All migrations applied               | ☐             |         |
| 27  | `npm run build:vps` exit 0. Folder ./dist-server/server.js + ./dist/index.html ada.     | `ls -la dist-server/ dist/index.html`                              | ☐             |         |
| 28  | `npm run check` + eslint 0 ERROR. Warning preexisting (tidak fatal) = OK.               | exit both = 0                                                      | ☐             |         |
| 29  | Symlink uploads → persistent storage. Owner deploy:deploy mode 750.                     | `ls -la                                                            | grep uploads` | ☐       |     |
| 30  | PostgreSQL 16 extension pgcrypto, uuid-ossp, citext, pg_trgm = TERINSTAL.               | `SELECT extname FROM pg_extension WHERE extname IN (...);` 4 rows. | ☐             |         |

---

## BAGIAN 4 — APP LOGIC + CRON JOBS (ITEM 31-40)

| #   | Verifikasi                                                                            | Evidence / Cara Cek                                                                   | Status ☐         | Catatan  |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------- | -------- | --- | --- |
| 31  | PM2 start app via ecosystem.config.js. Restarts 0, status online, uptime > 5 menit.   | `pm2 status hmsdp-absenyura`                                                          | ☐                |          |
| 32  | PM2 max_memory_restart = 1500M, node_args old-space 1536 MB.                          | `pm2 show hmsdp-absenyura                                                             | grep -E 'max_old | memory'` | ☐   |     |
| 33  | `process.send('ready')` dikirim → PM2 status online bukan launching.                  | `pm2 logs --nostream --lines 100                                                      | grep ready`      | ☐        |     |
| 34  | Health endpoint domain HTTPS `/api/status` 200 OK via curl. 127.0.0.1:3001 juga.      | Status code = 200                                                                     | ☐                |          |
| 35  | Sitemap XML canonical = YOUR-DOMAIN. BUKAN hmsdp.vercel.app.                          | `curl -s /sitemap.xml                                                                 | grep loc         | head -3` | ☐   |     |
| 36  | Halaman random `/does-not-exist-xyz` → branded 404 page (bukan Vercel 404 default).   | 200 OK HTML ada link back to home.                                                    | ☐                |          |
| 37  | CRON jobs 5 job TERDAFTAR di crontab -e: lifecycle, nonce, storage, semester, backup. | `crontab -l                                                                           | wc -l` ≥ 11      | ☐        |     |
| 38  | X-Cron-Secret header valid. Test manual curl trigger status 200.                      | `curl -H ... /api/cron/trigger?job=nonce_cleanup -o /dev/null -w %{http_code}` = 200. | ☐                |          |
| 39  | Login Super Admin / Admin / ContentAdmin OK. Cookie JWT httpOnly secure SameSite=Lax. | Chrome DevTools → Application → Cookies                                               | ☐                |          |
| 40  | PWA manifest.json load. service worker registered. Add to Home Screen work.           | Chrome Application tab → Service Workers                                              | ☐                |          |

---

## BAGIAN 5 — DR + PERFORMANCE + SCALE (ITEM 41-50)

| #   | Verifikasi                                                                                                                                                                                                                 | Evidence / Cara Cek                                         | Status ☐                 | Catatan     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ | ----------- | --- | --- |
| 41  | rclone di-install. Remote `b2remote` tersedia. Bucket dapat di-upload/dibaca.                                                                                                                                              | `rclone listremotes` + test upload dummy 1 KB file          | ☐                        |             |
| 42  | Script `vps-backup.sh manual` di-run → exit 0. Upload file .dump.gz + sha256 ke bucket. SHA match.                                                                                                                         | Stdout script exit 0. `rclone ls ...` file hari ini ADA.    | ☐                        |             |
| 43  | Script `vps-restore-test.sh` di-run → exit 0. Semua 6 table critical row count > 0 / tidak NaN.                                                                                                                            | Tail log final line: RESTORE TEST LULUS.                    | ☐                        |             |
| 44  | Crontab C5 backup run setiap 6 jam. Folder log /var/log/hmsdp ada backup.log.                                                                                                                                              | `ls -la /var/log/hmsdp/` + last modified                    | ☐                        |             |
| 45  | PostgreSQL `SHOW shared_buffers = 2GB`; work_mem 16MB; effective_cache 6GB.                                                                                                                                                | `psql -c "SHOW shared_buffers; SHOW effective_cache_size;"` | ☐                        |             |
| 46  | pg_stat_statements extension enabled. Top 5 query dashboard pertama < 4 detik.                                                                                                                                             | Query di Maintenance Monthly B.3d. mean_ms < 500.           | ☐                        |             |
| 47  | Artillery 60 detik 100 vu scan QR (health endpoint). P95 < 2000 ms, 0 5xx.                                                                                                                                                 | `artillery run` report. P95 < 2000 ms → Score ≥ 4.          | ☐                        |             |
| 48  | OOM kill 72 jam ZERO. Journalctl kernel 0 lines Out of memory.                                                                                                                                                             | `journalctl -k                                              | grep -i "killed process" | wc -l` = 0. | ☐   |     |
| 49  | Full cycle end-to-end: Create Class → Enroll → Session UPCOMING → cron trigger → CHECKIN_OPEN → 10 user scan QR (status HADIR) → Cron trigger → Checkin Closed + Auto ALFA user tidak scan → Export PDF/XLSX 10 row benar. | Logs app. PM2 error 0.                                      | ☐                        |             |
| 50  | _Paper check_: Dokumen VPS_OPS_PLAYBOOK.md disimpan digital + cetak fisik 1 copy di lemari Arsip. Sandi .env + SSH key tersimpan di password manager (BUKAN catatan WhatsApp).                                             | 3-item checklist.                                           | ☐                        |             |

---

## 📊 HASIL AKHIR AUDIT PRELAUNCH

```
Total PASS ......: ____ / 50
Total WARN ......: ____ / 50     (maksimal 2 WARN)
Total FAIL ......: ____ / 50     (WAJIB 0 FAIL sebelum go-live)
```

### KEPUTUSAN AUDIT (LINGKARI SALAH SATU):

```
🟢 GO-LIVE               🟡 CONDITIONAL (lampir tiket perbaikan)              🔴 HOLD / JANGAN DEPLOY
```

---

## ✍️ TANDA TANGAN

```
Auditor (Infokom HM SDP):

Nama lengkap:  ______________________________________________________
NIM:           ____________________     Jabatan: ____________________
Tanda tangan:  ____________________     Tanggal: ____/____/2026


PIC Teknis (Penanggung Jawab Sistem):

Nama lengkap:  ______________________________________________________
NIM:           ____________________     Jabatan: ____________________
Tanda tangan:  ____________________     Tanggal: ____/____/2026


Approval Ketua Himpunan / Pemangku Kepentingan:

Nama lengkap:  ______________________________________________________
NIM:           ____________________     Jabatan: Ketua HM SDP
Tanda tangan:  ____________________     Tanggal: ____/____/2026
```
