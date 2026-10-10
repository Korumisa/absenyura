# Deploy Step-by-Step — HM SDP E-Absensi ke Hostinger VPS

> **Target platform**: Hostinger VPS KVM (Ubuntu 22.04 LTS x86_64 — minimal 2 vCPU / 2 GB RAM / 40 GB NVMe)
> **Deployment pattern**: Zero-downtime `git pull` + PM2 reload + PM2 process guard (atau systemd unit)
> **Arsitektur**: Nginx reverse proxy (port 80/443) → Node.js (PM2 fork 1 instance di port 3001) → Supabase Postgres (remote)

---

## ⚠️ Pra-Deploy Checklist (Harus LULUS sebelum lanjut ke STEP 0)

| #   | Check                                                                                           | Status |
| --- | ----------------------------------------------------------------------------------------------- | ------ |
| 1   | Domain Anda sudah **point A record** ke IP VPS Hostinger (cek di `ping your-domain.com`)        | ☐      |
| 2   | Akses **SSH root** ke VPS (jika non-root, user ada di grup sudoers)                             | ☐      |
| 3   | Punya akun **Supabase** + Project ID + DATABASE_URL (pooler port 6543) + DIRECT_URL (port 5432) | ☐      |
| 4   | Punya akun **Cloudinary** (opsional tapi **sangat direkomendasikan**) untuk storage foto        | ☐      |
| 5   | SSH key Anda terpasang ke GitHub (jika repo private)                                            | ☐      |
| 6   | Secrets sudah di-generate (6 buah) untuk JWT / CSRF / Cron (lihat STEP 3)                       | ☐      |

---

## STEP 0 — Initial OS Hardening (Hostinger VPS fresh install)

Jalankan **SEMUA perintah** ini sebagai `root` atau user sudoers di VPS.

```bash
# 0.1 Update & upgrade semua paket
apt update && apt upgrade -y && apt autoremove -y

# 0.2 Install prerequisite dasar
apt install -y curl wget git htop vim nano unzip ufw fail2ban ca-certificates gnupg lsb-release

# 0.3 Set timezone ke WITA (Denpasar) / sesuaikan dengan timezone kampus
timedatectl set-timezone Asia/Makassar
timedatectl && date

# 0.4 Enable firewall (hanya izinkan SSH 22, HTTP 80, HTTPS 443)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable && ufw status verbose

# 0.5 (Disarankan) Buat user deploy non-root untuk menjalankan app
adduser deploy --gecos "" --disabled-password
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
chown -R deploy:deploy /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
```

---

## STEP 1 — Install Runtime Stack (Node.js 22, Nginx, Certbot, PM2)

```bash
# ===== Login sebagai user deploy dari TAHAP INI =====
# su - deploy

# 1.1 Install Node.js 22 LTS via NodeSource (wajib v22 sesuai package.json engines)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node -v   # harus v22.x.y
npm -v    # harus 10.x

# 1.2 Install PM2 global (process manager)
sudo npm install -g pm2@latest
pm2 -v
pm2 startup systemd -u deploy --hp /home/deploy
# ⚠️ JALANKAN perintah sudo yang DICETAK oleh `pm2 startup` di atas!

# 1.3 Install Nginx + Certbot SSL (Let's Encrypt)
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
nginx -v

# 1.4 Fail2ban — basic protection
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

---

## STEP 2 — Clone Repository & Persistent Storage

```bash
# 2.1 Buat folder app + symlink folder uploads ke persistent storage
# (supaya uploads TIDAK TERHAPUS saat redeploy)
sudo mkdir -p /var/www/hmsdp
sudo mkdir -p /var/data/hmsdp-uploads/public-site
sudo mkdir -p /var/data/hmsdp-uploads/attendance
sudo mkdir -p /var/data/hmsdp-uploads/excuses
sudo mkdir -p /var/log/hmsdp
sudo chown -R deploy:deploy /var/www/hmsdp /var/data/hmsdp-uploads /var/log/hmsdp

cd /var/www/hmsdp

# 2.2 Clone repo (ganti URL ke repo Anda — pakai SSH key jika private)
git clone git@github.com:hmsdp/absenyura.git .
# ATAU jika repo Anda di path lain: git clone <your-repo-url> .

# 2.3 Symlink persistent uploads ke ./uploads (ganti direktori yang akan ditimpa redeploy)
rm -rf ./uploads
ln -sf /var/data/hmsdp-uploads ./uploads
ls -la ./uploads   # ➜ ./uploads -> /var/data/hmsdp-uploads

# 2.4 Buat folder logs PM2
mkdir -p ./logs
```

---

## STEP 3 — Isi Environment Variables (.env Production)

```bash
cd /var/www/hmsdp

# Copy template env VPS dari repo
cp deploy/.env.vps.example .env
chmod 600 .env    # hanya owner yang bisa baca

# Generate 6 secret SECURE (jalankan 6x, copy hasil ke masing-masing key di .env)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit isi .env
nano .env
```

### Isi .env — Checklist WAJIB:

1. **`APP_URL` dan `VITE_APP_URL`** — domain full `https://your-domain.com` **TANPA trailing slash** dan **HARUS SAMA PERSIS**.
2. **`DATABASE_URL`** — copy dari Supabase → Project Settings → Database → **Connection Pooling** (URI port 6543, **centang Use connection pooling + Transaction mode**). **Tambahkan manual**:
   ```
   ?pgbouncer=true&connection_limit=5&statement_cache_size=0&connect_timeout=5&pool_timeout=5
   ```
   > `connection_limit=5` cocok untuk VPS 2GB (1 process Node.js = 5 koneksi). JANGAN melebihi batas Supabase pooler Anda.
3. **`DIRECT_URL`** — copy dari Supabase → Database → URI **direct (port 5432)** (bukan pooler). Dipakai **hanya untuk prisma migrate deploy**.
4. **`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ATTENDANCE_PROOF_SECRET`, `SEED_SECRET`, `INTERNAL_SECRET`, `CRON_SECRET`** — masing-masing diisi dengan hex random 32+ bytes yang **BERBEDA-BEDA**.
5. **`CLOUDINARY_URL`** — diisi jika ingin foto tersimpan di Cloudinary (disarankan). Jika dikosongkan, foto tersimpan ke `./uploads` local (tapi **HARUS** symlink persistent STEP 2.3 sudah dibuat).
6. **`CORS_ORIGINS`** — jika ada www + non-www, pisahkan koma: `https://your-domain.com,https://www.your-domain.com`

---

## STEP 4 — Install Dependencies & Build

```bash
cd /var/www/hmsdp

# 4.1 Install dependencies (termasuk devDependencies: vite/typescript/esbuild dibutuhkan build)
# Jika VPS <= 2GB RAM, tambahkan swapfile dulu (STEP 4.0 dibawah)
NODE_ENV=development npm ci
# ⚠️ JIKA GAGAL di sharp / @node-rs/bcrypt (native module):
#    sudo apt install -y python3 make g++ libvips-dev
#    lalu ulangi: NODE_ENV=development npm ci

# 4.2 Generate Prisma Client & Jalankan Database Migrasi
# ⚠️ SEBELUM DEPLOY PERTAMA KALI — WAJIB jalankan ini!
# Semua migration di prisma/migrations/ akan apply ke DB Supabase.
npx prisma@6.4.1 migrate deploy
# Verifikasi:
npx prisma@6.4.1 migrate status

# 4.3 Build client (Vite → dist/) DAN server (TS → dist-server/)
# Pastikan NODE_ENV=production diset (di .env / command line) karena VITE_APP_URL dibaca saat build!
export NODE_ENV=production
npm run build:vps
# ⏱ Estimasi: 2-5 menit di 2GB VPS.

# 4.4 Verifikasi output build
ls -la ./dist/index.html         # SPA entry
ls -la ./dist-server/server.js   # Node entry
ls -la ./dist-server/app.js      # Express app
```

### STEP 4.0 (Opsional) — Buat swapfile jika RAM VPS ≤ 2 GB

Saat `npm ci` / build, native modules bisa makan 1.5 GB memory. Jika VPS hanya 2GB:

```bash
sudo fallocate -l 3G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
swapon --show
```

---

## STEP 5 — Konfigurasi Nginx Reverse Proxy

```bash
# 5.1 Copy template konfigurasi nginx ke sites-available
sudo cp /var/www/hmsdp/deploy/nginx.conf.example /etc/nginx/sites-available/hmsdp.conf

# 5.2 Ganti your-domain.com dengan domain SESUNGGUHNYA
sudo nano /etc/nginx/sites-available/hmsdp.conf
# Cari semua "your-domain.com" → ganti domain Anda (2 blok server: port 80 & 443)

# 5.3 Aktifkan site + cek syntax
sudo ln -sf /etc/nginx/sites-available/hmsdp.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # hapus default nginx welcome
sudo nginx -t
# ⚠️ Output harus "syntax is ok + test is successful". JANGAN LANJUT JIKA ERROR.
sudo systemctl reload nginx
```

---

## STEP 6 — Start Aplikasi via PM2

```bash
cd /var/www/hmsdp

# 6.1 Start app via PM2 (pakai ecosystem.config.js yang sudah disediakan)
pm2 start ecosystem.config.js --env production
# ➜ Output: [PM2] Spawning PM2 daemon ... status online.

# 6.2 Simpan proses list (supaya auto-start saat reboot VPS)
pm2 save

# 6.3 Verifikasi app berjalan + port listening
pm2 list
# ➜ Cek status: "online", restart: 0, uptime naik.
pm2 logs hmsdp-absenyura --lines 80 --nostream
# ➜ Harus muncul log: "Server ready on port 3001" + "Cron jobs started"
# ➜ TIDAK BOLEH ada stacktrace FATAL (CLOUDINARY warning OK)

# 6.4 Test health endpoint via localhost (sebelum lewat Nginx)
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3001/api/status
# ➜ Harus HTTP 200 (jika 503 = DB belum connect, cek DATABASE_URL)
curl -s http://127.0.0.1:3001/api/health | head -c 300
```

---

## STEP 7 — Issuing SSL Certificate (HTTPS)

```bash
# 7.1 Pastikan DNS A-record sudah propagasi (cek dari terminal lokal Anda):
#     ping your-domain.com → harus reply IP VPS Hostinger

sudo certbot --nginx \
  -d your-domain.com -d www.your-domain.com \
  --non-interactive --agree-tos -m admin@your-domain.com --redirect

# ➜ Certbot otomatis: generate cert + edit nginx conf + redirect HTTP->HTTPS
sudo nginx -t && sudo systemctl reload nginx

# 7.2 Test HTTPS + HSTS dari LOKAL (bukan dari VPS):
#     Buka browser https://your-domain.com → gembok hijau.
#     https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com → minimal "A"
```

---

## STEP 8 — Setup Cron Jobs (Session Lifecycle)

Ada 2 opsi — **PILIH SALAH SATU**.

### ⭐ OPSI A — Crontab VPS native (REKOMENDASI — paling stabil untuk shared/non-serverless)

Cron ini memanggil endpoint `/api/cron/trigger` yang sama dengan Vercel Cron endpoint. App sudah punya guard di [cron.ts](file:///c:/Users/shink/Pictures/absenyura/server/routes/cron.ts) (butuh `X-Cron-Secret` header).

```bash
# 8.1 Export sebagai environment CRON_SECRET dulu (dari nilai .env)
CRON_SECRET=$(grep CRON_SECRET /var/www/hmsdp/.env | cut -d '=' -f2)
echo "CRON_SECRET: $(echo -n "$CRON_SECRET" | head -c 8)..."

# 8.2 Tambahkan 4 cron entries. EDIT crontab:
crontab -e

# Copy paste di bawah (sesuaikan domain + CRON_SECRET hex):
# -----------
# (a) Session lifecycle: setiap 1 MENIT (UPCOMING→ACTIVE, ACTIVE→CLOSED, auto-alfa)
* * * * * curl -sS -X GET "https://your-domain.com/api/cron/trigger?job=daily" -H "X-Cron-Secret: GANTI_DENGAN_CRON_SECRET_DI_ENV" >> /var/log/hmsdp/cron-session.log 2>&1

# (b) Daily cleanup nonce + idempotency key — setiap jam 1 pagi
0 1 * * * curl -sS -X GET "https://your-domain.com/api/cron/trigger?job=nonce" -H "X-Cron-Secret: GANTI_DENGAN_CRON_SECRET_DI_ENV" >> /var/log/hmsdp/cron-nonce.log 2>&1

# (c) Daily foto cleanup (hapus foto > 7 hari) — setiap jam 2 pagi
0 2 * * * curl -sS -X GET "https://your-domain.com/api/cron/trigger?job=photos" -H "X-Cron-Secret: GANTI_DENGAN_CRON_SECRET_DI_ENV" >> /var/log/hmsdp/cron-photos.log 2>&1

# (d) Daily semester update — setiap jam 3 pagi
0 3 * * * curl -sS -X GET "https://your-domain.com/api/cron/trigger?job=semester" -H "X-Cron-Secret: GANTI_DENGAN_CRON_SECRET_DI_ENV" >> /var/log/hmsdp/cron-semester.log 2>&1
# -----------

# 8.3 Verifikasi crontab tersimpan
crontab -l

# 8.4 Manual trigger TEST session cron (jalan kan sekali sekarang untuk memastikan):
curl -sS -X GET "https://your-domain.com/api/cron/trigger?job=daily" \
  -H "X-Cron-Secret: GANTI_DENGAN_CRON_SECRET_DI_ENV" -w "\nHTTP:%{http_code}\n"
# ➜ Harus HTTP 200 + body JSON {"success":true,...}
# Jika 401/403 → CRON_SECRET header salah ketik / beda dengan .env
# Jika 200 tapi pesan "unknown job" → cek ?job= parameter
```

### OPSI B — node-cron di-dalam process (TIDAK DISARANKAN untuk production)

Hanya untuk staging / jika crontab tidak bisa diakses. Jalankan `startCronJobs()` langsung di `server.ts` — saat ini sudah ter-enable otomatis jika env `VERCEL` tidak ada (lihat [server.ts](file:///c:/Users/shink/Pictures/absenyura/server/server.ts#L18-L18)). **Kelemahan**: Jika PM2 restart, semua job ter-reset; tidak share state antar instance cluster.

---

## STEP 9 — Monitoring & Alerting (Opsional Tapi Disarankan)

```bash
# 9.1 PM2 monitoring
pm2 monit                  # live CPU + memory
pm2 logs hmsdp-absenyura --lines 200 --err  # error saja (debugging production)

# 9.2 Rotasi log — install pm2-logrotate agar logs tidak memenuhi disk
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14

# 9.3 Monitoring uptime (cron-based availability script yang sudah ada di repo)
cd /var/www/hmsdp
# Edit APP_URL + CRON_SECRET + ALERT_WEBHOOK_URL di .env, lalu:
crontab -e
# Tambahkan:
*/5 * * * * cd /var/www/hmsdp && /usr/bin/node scripts/monitor-availability.mjs >> /var/log/hmsdp/uptime.log 2>&1
```

---

## STEP 10 — Zero-Downtime Redeploy Workflow (setelah code berubah)

Setelah Anda commit & push ke branch `main` di GitHub:

```bash
# Login ke VPS
ssh deploy@IP-VPS
cd /var/www/hmsdp

# (BASH ONE-LINER deployment — copy paste)
set -e \
  && echo "[1/6] Pull latest code..." && git pull origin main \
  && echo "[2/6] Install deps..." && NODE_ENV=development npm ci \
  && echo "[3/6] DB migrate deploy (idempotent)..." && npx prisma@6.4.1 migrate deploy \
  && echo "[4/6] Rebuild client + server..." && NODE_ENV=production npm run build:vps \
  && echo "[5/6] Graceful reload PM2..." && pm2 reload ecosystem.config.js --update-env \
  && echo "[6/6] Save PM2 process list..." && pm2 save \
  && echo "✅ Deployment successful!" \
  && curl -s -o /dev/null -w "  Health check: HTTP %{http_code}\n" http://127.0.0.1:3001/api/status

# Jika ada error:
pm2 logs hmsdp-absenyura --err --lines 50
```

**Roolback jika deploy gagal parah**:

```bash
cd /var/www/hmsdp
git log --oneline -n 3   # ambil hash commit sebelumnya (contoh: abc1234)
git reset --hard abc1234
NODE_ENV=development npm ci && npm run build:vps && pm2 reload ecosystem.config.js && pm2 save
```

---

## STEP 11 — Post-Deploy SMOKE TEST (WAJIB dijalankan SEBELUM memberikan akses ke user)

Salin ke spreadsheet dan centang setiap item:

### 11.1 Public Pages (tanpa login — port 443 HTTPS)

| #   | Test Case                                                     | Expected Result                                                        | Status |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| 1   | `https://your-domain.com/`                                    | Beranda HM SDP tampil dengan benar, logo loading, CSS tidak rusak      | ☐      |
| 2   | Browser DevTools → Console                                    | NOL error 404 / 500 / CORS / MIME type                                 | ☐      |
| 3   | `/berita`                                                     | Daftar berita (atau empty state CMS)                                   | ☐      |
| 4   | `/program-kerja`                                              | Daftar progja                                                          | ☐      |
| 5   | `/galeri`                                                     | Galeri kosong / foto                                                   | ☐      |
| 6   | `curl -I https://your-domain.com/berita/slug-tidak-ada`       | HTTP **404** (bukan 200 blank / default nginx)                         | ☐      |
| 7   | `curl -I https://your-domain.com/random-unknown-route-xyz123` | HTTP **404** (branded 404 page)                                        | ☐      |
| 8   | PWA manifest: `your-domain.com/manifest.webmanifest`          | 200 JSON + app name E-Absensi                                          | ☐      |
| 9   | Sitemap: `/api/sitemap.xml`                                   | 200, URL di <loc> berisi **your-domain.com** (bukan hmsdp.vercel.app!) | ☐      |

### 11.2 Auth & Protected Admin

| #   | Test Case                                                            | Expected Result                                                              | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| 10  | `/login`                                                             | Form login tampil                                                            | ☐      |
| 11  | Login pakai `SEED_SUPER_ADMIN_EMAIL / PASSWORD` (jika sudah di-seed) | Sukses, redirect ke dashboard, cookie accessToken & refreshToken + csrfToken | ☐      |
| 12  | Refresh halaman `/dashboard`                                         | Tetap login — tidak diarahkan ke login                                       | ☐      |
| 13  | Logout menu kanan atas → Logout                                      | Cookie terhapus, redirect ke /login                                          | ☐      |

### 11.3 Fitur Kritis Absensi

| #   | Test Case                                                                                    | Expected Result                                                     | Status |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------ |
| 14  | Admin create Location (radius 50m) → create Session (aktif sekarang) → tampilkan QR          | Session status ACTIVE, QR muncul                                    | ☐      |
| 15  | Buka `/attend?session_id=...` di HP → allow kamera & GPS → scan QR → capture foto → Check-in | Sukses: HTTP 201, record di tab Attendances sesi                    | ☐      |
| 16  | Photo bukti attendance tersimpan di DB                                                       | Column `photo_url` ISI — Cloudinary URL / `/uploads/attendance/...` | ☐      |
| 17  | Download `.xlsx` / `.pdf` di tab Reports                                                     | File download, tidak corrupt                                        | ☐      |

### 11.4 Cron & Backend Jobs

| #   | Test Case                                                                                                              | Expected Result                                                        | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| 18  | Manual trigger job session: `curl -H "X-Cron-Secret: $CRON_SECRET" https://your-domain.com/api/cron/trigger?job=daily` | `{"success":true,...}` — HTTP 200                                      | ☐      |
| 19  | Tunggu 65 detik, cek log PM2 `pm2 logs --lines 200`                                                                    | Ada log `[Cron] now=... activated=... closed=...`                      | ☐      |
| 20  | Buat sesi `check_in_close_at` sudah lewat 3 menit → trigger cron job → cek status session di DB                        | Berubah jadi `CLOSED` + user tidak absen → auto `ABSENT` di attendance | ☐      |

### 11.5 Infrastructure

| #   | Test Case                             | Expected Result                                           | Status |
| --- | ------------------------------------- | --------------------------------------------------------- | ------ |
| 21  | `free -h`                             | RAM usage < 80% (bisa naik turun 10% saat compile wajar)  | ☐      |
| 22  | `df -h`                               | Disk usage < 60% (uploads folder disymlink ke persistent) | ☐      |
| 23  | `uptime` → load average < jumlah vCPU | Load average normal (misal 2vCPU → load < 2.0)            | ☐      |
| 24  | `pm2 list`                            | Restart count = 0 (jika > 0 cek logs — crash loop)        | ☐      |

---

## 📝 Troubleshooting Flow — Common Production Errors

### ❌ `pm2 logs` menunjukkan: `[FATAL] DATABASE_URL must be set`

**Solusi**: `.env` tidak terbaca PM2. Jalankan:

```bash
pm2 restart ecosystem.config.js --update-env
pm2 save
# ATAU export .env di shell sebelum start:
export $(grep -v '^#' /var/www/hmsdp/.env | xargs) && pm2 restart ecosystem.config.js
```

### ❌ Health check `/api/status` HTTP 503, logs: `Prisma P2024 connection_pool`

**Solusi**:

1. Turunkan `connection_limit` di `DATABASE_URL` menjadi `=3`
2. Pastikan Supabase Pooler limit Anda > concurrent Node.js instances (1 x connection_limit)
3. Cek Supabase → Database → Database roles → `pooler` role connections (tidak melebihi batas).

### ❌ Build gagal: `npm ci` ERROR di `sharp` atau `@node-rs/bcrypt`

**Solusi**: Install build tools + libvips

```bash
sudo apt install -y python3 make g++ libvips-dev pkg-config
cd /var/www/hmsdp && rm -rf node_modules package-lock.json
npm cache clean --force
npm ci --omit=dev
```

Masih gagal? Ganti `sharp` di package.json dan pindahkan EXIF stripping ke client-only (opsi darurat).

### ❌ Halaman `/login` / dashboard → BLANK putih

**Solusi**: `tail -n 50 /var/log/nginx/error.log`

- Jika `413 Request Entity Too Large` → `client_max_body_size 20M;` di nginx.conf kurang besar
- Jika `502 Bad Gateway` → app PM2 mati / port 3001 tidak listening → `pm2 restart`
- Jika CORS error → `CORS_ORIGINS` di `.env` tidak memuat origin yang diminta

### ❌ Cron Job HTTP 403 Forbidden

**Solusi**: Buka crontab → `X-Cron-Secret` header vs `.env CRON_SECRET` — **pastikan persis sama (case-sensitive hex)**. No whitespace tambahan.

### ❌ Foto absensi / poster CMS **tidak muncul** (404 setelah 1 minggu)

**Solusi**: Redeploy menghapus `./uploads` → STEP 2.3 symlink ke `/var/data/hmsdp-uploads` **tidak** dibuat. Jalankan:

```bash
ls -la /var/www/hmsdp/uploads  # harus -> /var/data/hmsdp-uploads
# Jika tidak, buat:
rm -rf /var/www/hmsdp/uploads
ln -sf /var/data/hmsdp-uploads /var/www/hmsdp/uploads
chown -R deploy:deploy /var/www/hmsdp/uploads
```

---

## 🎯 SLA Ketersediaan 99.9% — Maintenance Checklist Mingguan

| Task                                | Frekuensi      | Command                                                       |
| ----------------------------------- | -------------- | ------------------------------------------------------------- |
| Cek PM2 restart count & uptime      | Mingguan       | `pm2 list`                                                    |
| Cek disk usage < 80%                | Mingguan       | `df -h /`                                                     |
| Cek RAM < 85% + swap normal         | Mingguan       | `free -h`                                                     |
| Prune Docker apt cache (hemat disk) | Bulanan        | `sudo apt autoremove && sudo journalctl --vacuum-time=7d`     |
| Renew certbot SSL (otomatis)        | Sebelum expiry | `sudo certbot renew --dry-run`                                |
| Audit Supabase slow query log       | Mingguan       | Supabase Dashboard → Logs Explorer                            |
| Update OS security patches          | Mingguan       | `sudo apt update && sudo apt upgrade -y`                      |
| Backup Prisma schema + data         | Harian         | Cron GitHub Actions `.github/workflows/cron-daily-backup.yml` |

---

## 🎉 Deploy Sukses! Langkah Terakhir

✅ Email user bahwa sistem sudah live di `https://your-domain.com`
✅ Berikan credential Super Admin (default) ke 1 orang PIC SDM / Ketua HM saja
✅ Seed data fakultas, kelas, mahasiswa via menu Master Data / Users
✅ Isi CMS profile organisasi lewat panel **Konten Website** sesuai [CMS_PRODUCTION_CHECKLIST.md](file:///c:/Users/shink/Pictures/absenyura/docs/CMS_PRODUCTION_CHECKLIST.md)
✅ Jalankan k6 load test 50 concurrent users (opsional): `npm run test:load`

Selesai.
