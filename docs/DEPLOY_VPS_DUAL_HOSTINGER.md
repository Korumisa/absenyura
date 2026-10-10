# Panduan Lengkap — Deploy 1 VPS DUAL PURPOSE (App Node.js + PostgreSQL Self-Host)

> **Target Paket**: Hostinger VPS KVM 2 — 2 vCPU · 8 GB RAM · 100 GB NVMe · 8 TB bandwidth · Ubuntu 22.04 LTS x86_64
> **Arsitektur**: Nginx reverse proxy (80/443) → Node.js PM2 (127.0.0.1:3001, heap 1,5 GB) → PgBouncer (127.0.0.1:6432) → PostgreSQL 16 (127.0.0.1:5432, shared_buffers 2 GB)
> **Security 4 Layer**: UFW default deny (hanya 22/80/443) → Postgres listen 127.0.0.1 only → pg_hba.conf reject 0.0.0.0/0 → role hmsdp_app non-superuser
> **Waktu estimasi pengerjaan (admin CLI dasar)**: 2-3 jam

---

## ⚠️ **STOP DULU — Pra-Deploy Checklist WAJIB LULUS 100%**

Tandai SEMUA checklist ☐ ini sebelum menjalankan STEP 0. Jika SATU SAJA belum berstatus ✅ — JANGAN lanjut.

```
☑ Domain Anda (mis. absen-hmsdp-undiksha.ac.id) SUDAH point A record ke IP VPS.
     Verifikasi local: ping -c2 <domain> → IP yang muncul = IP publik VPS Hostinger.
☑ Order Hostinger VPS KVM 2: region SINGAPURA (ap-southeast), OS Ubuntu 22.04 LTS x86_64.
☑ Bisa login SSH root (atau user sudoers) dari laptop client LANCAR tanpa password (via SSH key).
☑ Punya akun Object Storage External:
    - Pilihan 1: Backblaze B2 (USD 6/TB, region ap-southeast)
    - Pilihan 2: Cloudflare R2 (tanpa egress fee)
    - Pilihan 3: IDrive E2 (SG region)
    Siapkan: bucket name, access key, secret key (3 item ini untuk rclone).
☑ Cloudinary account ada & CLOUDINARY_URL siap (agar foto absen TIDAK bikin I/O contention DB).
☑ Repository git (GitHub/GitLab) bisa di-clone dari VPS (SSH key deploy user ada di repo deploy keys).
☑ Secrets 6x 32 byte hex SUDAH di-generate (nanti diisi STEP 4).
☑ Jam operasi maintenance window = 13:00 - 16:00 WITA (bukan jam absen).
☑ (Opsional) Jika ada data existing Supabase production: cutover plan di deploy/SELFHOST_CUTOVER_PLAN.md.
```

---

## STEP 0 — Initial OS Hardening + Kernel Tuning untuk Postgres 16

_Run sebagai `root` (atau user sudoers + prefix sudo)._

```bash
# 0.1 Preflight check (auto-audit spec VPS)
apt install -y curl
curl -sSL <RAW_URL_REPO>/scripts/vps-preflight.sh | sudo bash
# Expected output: 0 FAIL. Jika ada 1 FAIL → perbaiki sebelum lanjut!

# 0.2 Update package + install base utils
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y && apt autoremove -y
apt install -y curl wget git htop iotop iftop nmap sysstat vim-nox nano unzip ufw fail2ban \
               ca-certificates gnupg lsb-release software-properties-common \
               lvm2 xfsprogs bash-completion apt-transport-https shellcheck

# 0.3 Set timezone + locale id-ID.UTF-8
timedatectl set-timezone Asia/Makassar
locale-gen id_ID.UTF-8 en_US.UTF-8
update-locale LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
timedatectl && locale -a | grep -E 'id_ID|en_US'

# 0.4 Kernel sysctl parameters PostgreSQL (disable THP + swap + networking hardening)
cat > /etc/sysctl.d/99-hmsdp-postgres.conf <<'EOF'
# --- Memory & Transparent Huge Pages (merusak Postgres latency)
vm.nr_hugepages = 0
vm.swappiness = 1
vm.dirty_background_ratio = 2
vm.dirty_ratio = 10
vm.overcommit_memory = 2
vm.overcommit_ratio = 80
# --- Shared memory minimal 4 GB untuk Postgres shared_buffers 2 GB
kernel.shmmax = 4294967296
kernel.shmall = 1048576
kernel.shmmni = 4096
# --- Network hardening (DDoS protection ringan)
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.core.somaxconn = 1024
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fin_timeout = 15
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
# --- Security: kernel pointer restriction
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
EOF
sysctl --system

# 0.5 Disable THP runtime + persist rc.local
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
cat > /etc/rc.local <<'EOF'; chmod +x /etc/rc.local
#!/bin/bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled 2>/dev/null
echo never > /sys/kernel/mm/transparent_hugepage/defrag 2>/dev/null
exit 0
EOF

# 0.6 SWAPFILE 3 GB (jika belum ada) — safety native build npm + query burst
if ! swapon --show | grep -q file; then
  fallocate -l 3G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap defaults 0 0' >> /etc/fstab
fi
swapon --show && free -h

# 0.7 User deploy non-root (jalankan app + cron)
adduser deploy --gecos "" --disabled-password
usermod -aG sudo,www-data deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy && chmod 440 /etc/sudoers.d/deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
[ -f /root/.ssh/authorized_keys ] && cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
# 🔴 PENTING: TEST SSH login sebagai deploy SEBELUM LANJUT! BUKA terminal TAB BARU:
#   ssh deploy@<IP_VPS>
# Jika TIDAK MASUK — JANGAN LANJUT STEP SELANJUTNYA (ufw akan enable, berisiko terkunci).

# 0.8 Firewall UFW hardened via deploy script (idempoten)
cd ~ && git clone --depth=1 <YOUR_GIT_REPO_URL> /tmp/hmsdp-install
bash /tmp/hmsdp-install/deploy/security/ufw-rules.sh
# Expected: Status: active. Hanya 22 (limit), 80, 443, lo allow. Port lain DENY!
```

✅ **Verifikasi STEP 0**:

```bash
sudo -u deploy ssh localhost 'echo OK'   # deploy user bisa SSH local
ufw status numbered                       # hanya 22/limit, 80, 443, lo allow
free -h | tail -3 ; swapon --show         # swap 3G aktif
pgrep hugepage ; echo "THP disabled"     # seharusnya THP disabled = tidak ada pgrep
```

---

## STEP 1 — Install Runtime Stack: Node 22, PM2, Nginx, Certbot, PostgreSQL16, PgBouncer, rclone

```bash
# Login sebagai user deploy sekarang:
#   su - deploy
# Jalankan dengan prefix `sudo` untuk perintah root-level.

# 1.1 Node.js 22 LTS via NodeSource (exact version package.json engines >=22 <23)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node -v   # expected: v22.x.y
npm -v    # expected: 10.x.x

# 1.2 PM2 global (process manager app)
sudo npm install -g pm2@latest
pm2 -v
pm2 startup systemd -u deploy --hp /home/deploy
# 🔴 SALIN perintah `sudo env PATH=...` yang dicetak lalu JALANKAN! (pm2 startup auto-boot)
pm2 save --force

# 1.3 Nginx + Certbot (SSL Let's Encrypt)
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx && nginx -v

# 1.4 PostgreSQL 16 (official PostgreSQL apt repo — NOT default Ubuntu 22.04 (versi 14))
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update && sudo apt install -y postgresql-16 postgresql-client-16 postgresql-contrib-16 \
                                       pgbouncer postgresql-16-pg-stat-statements pg_activity
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "SELECT version();"   # expected: PostgreSQL 16.x ...
sudo -u postgres psql -c "SHOW shared_buffers;"  # default 128MB nanti kita GANTI STEP 5b

# 1.5 rclone (backup ke object storage external)
curl https://rclone.org/install.sh | sudo bash
rclone version   # expected: rclone v1.65+

# 1.6 Fail2ban (blokir brute force SSH / Nginx 4xx massal)
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

---

## STEP 2 — Clone Repo + Symlink Persistent Storage (Uploads & Backups Lokal)

```bash
# 2.1 APP directory + persistent storage (folder TIDAK TERHAPUS redeploy)
sudo mkdir -p /var/www/hmsdp /var/lib/hmsdp-persistent/uploads \
              /var/lib/hmsdp-persistent/backups /var/log/hmsdp
sudo chown -R deploy:deploy /var/www/hmsdp /var/lib/hmsdp-persistent /var/log/hmsdp
sudo chmod -R 750 /var/lib/hmsdp-persistent /var/log/hmsdp

# 2.2 Clone repo (sesuaikan branch — GANTI main dengan production branch Anda)
cd /var/www/hmsdp
git clone --branch main --depth 1 <YOUR_GIT_REPO_URL> .
# Jika repo PRIVATE:
#   1. ssh-keygen -t ed25519 -C "hmsdp-vps-deploy"
#   2. Tambahkan public key ke GitHub: Settings → Deploy keys (write access needed)
#   3. Lalu git clone git@github.com:ORG/REPO.git .

# 2.3 Symlink persistent: ./uploads → /var/lib/hmsdp-persistent/uploads
ln -sfn /var/lib/hmsdp-persistent/uploads uploads
ln -sfn /var/log/hmsdp logs
# Verifikasi
ls -la | grep -E 'uploads|logs'   # expected: -> /var/lib/hmsdp-persistent/uploads (warna biru muda symlink)

# 2.4 Cron logrotate monthly uploads (jika Cloudinary gagal, fallback uploads foto)
sudo tee /etc/logrotate.d/hmsdp-uploads >/dev/null <<'EOF'
/var/log/hmsdp/*.log {
    monthly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    su deploy deploy
    create 640 deploy deploy
}
EOF
```

---

## STEP 3 — Setup rclone Backup Object Storage

```bash
# 3.1 Jalankan rclone config (INTERAKTIF 3-5 menit):
rclone config
#   n) New remote
#   name> b2remote                                  (SAMAKAN dengan BACKUP_RCLONE_REMOTE nanti)
#   Storage> 5 (Backblaze B2)  ATAU  4 (Cloudflare R2 via S3 compatible) ATAU 12 Google Drive
#   (Masukkan account/key/bucket yang Anda siapkan pre-deploy)
#   y) Yes save config.

# 3.2 Test read + write bucket (buat 1 file dummy):
echo "hmsdp-rclone-test-$(date +%s)" | rclone rcat b2remote:MY_BUCKET_NAME/test-rclone.txt
rclone ls b2remote:MY_BUCKET_NAME | head     # file test ada
rclone delete b2remote:MY_BUCKET_NAME/test-rclone.txt
# ✅ Jika 3 perintah atas BERHASIL → rclone OK.
```

---

## STEP 4 — Isi .env Production

```bash
cp deploy/.env.vps-selfhost.example .env
chmod 600 .env                # 🔴 HANYA owner deploy yang boleh baca.
# 🔴 JANGAN PERNAH git add .env — sudah di .gitignore.

# 4.1 Generate 6 SECRET 32-byte hex (copy masing-masing ke clipboard):
for i in 1 2 3 4 5 6; do node -e "console.log(crypto.randomBytes(32).toString('hex'))"; done

# 4.2 Edit .env dengan nano:
nano .env
```

**Isi `.env` bagian demi bagian — JANGAN ADA YANG KOSONG**:

| Key                                         | Nilai yang harus diisi                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `APP_URL` / `VITE_APP_URL` / `FRONTEND_URL` | `https://your-domain.com` (SAMA PERSIS ketiganya)                                                             |
| `CORS_ORIGINS`                              | `https://your-domain.com,https://www.your-domain.com`                                                         |
| `DATABASE_URL`                              | Ganti `<HMSDP_APP_PASSWORD>` dengan 1 random password 32 hex. **CATAT password ini** (nanti dipakai STEP 5a). |
| `DIRECT_URL`                                | Password SAMA PERSIS dengan DATABASE_URL di atas.                                                             |
| 6 Secret slots                              | Isi dengan 6 random hex dari STEP 4.1                                                                         |
| `CLOUDINARY_URL`                            | Copy paste dari dashboard Cloudinary                                                                          |
| SuperAdmin + Admin emails + passwords       | Isi email official Anda + password kuat (min 16 char)                                                         |
| `BACKUP_RCLONE_REMOTE`                      | `b2remote` (sama dengan STEP 3)                                                                               |
| `BACKUP_RCLONE_PATH`                        | `BUCKET_NAME/hmsdp-db-backups`                                                                                |
| `ALERT_WEBHOOK_URL`                         | (Opsional) Slack / Discord Webhook — backup FAIL akan dikirim notif                                           |

---

## STEP 5 — PostgreSQL 16 + PgBouncer Configuration

### 5a. Jalankan Prereq DB (extension + role + database)

```bash
# Generate password hmsdp_app (SAMAKAN dengan DATABASE_URL di STEP 4):
HMSDP_PASS=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
echo "Password hmsdp_app: $HMSDP_PASS"   # simpan ini di .env!
# Edit file deploy/prisma-selfhost-prereq.sql:
sed -i "s|<CHANGE_ME_PASSWORD_32BYTE_HEX>|$HMSDP_PASS|g" deploy/prisma-selfhost-prereq.sql
# Jalankan sebagai postgres superuser:
sudo -u postgres psql -f deploy/prisma-selfhost-prereq.sql
# ✅ Expected output AKHIR: ✓ PREREQUISITES BERHASIL. Selanjutnya: npx prisma migrate deploy

# 🔴 UPDATE .env DATABASE_URL dan DIRECT_URL pakai $HMSDP_PASS yang SAMA!
```

### 5b. Replace postgresql.conf + pg_hba.conf hardened

```bash
# Backup configs default
sudo cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.bak.$(date +%s)
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.bak.$(date +%s)

# Append tuning parameter KE file postgresql.conf (dari template snippet):
cat deploy/security/postgresql.conf.snippet | sudo tee -a /etc/postgresql/16/main/postgresql.conf

# Replace pg_hba.conf hardened:
sudo cp deploy/security/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf
sudo chown postgres:postgres /etc/postgresql/16/main/pg_hba.conf
sudo chmod 640 /etc/postgresql/16/main/pg_hba.conf
```

### 5c. Systemd drop-in override Postgres (OOM protection + Nice)

```bash
sudo mkdir -p /etc/systemd/system/postgresql@16-main.service.d
sudo cp deploy/security/postgresql-16-main-override.conf \
          /etc/systemd/system/postgresql@16-main.service.d/override.conf
sudo systemctl daemon-reload
```

### 5d. Restart Postgres cluster 16 main

```bash
sudo pg_ctlcluster 16 main restart
sudo pg_isready                     # expected: /var/run/postgresql:5432 - accepting connections
sudo ss -tlnp | grep postgres       # HANYA 127.0.0.1:5432 (BUKAN 0.0.0.0)! Jika 0.0.0.0 = salah config, cek kembali postgresql.conf line listen_addresses.
```

### 5e. Test koneksi dari user deploy ke DB via socket

```bash
# Sebagai user deploy, test koneksi dengan password di .env
psql "host=/var/run/postgresql port=5432 user=hmsdp_app dbname=hmsdp" -c "SELECT version();"
# Akan diminta password → isi $HMSDP_PASS dari STEP 5a → jika muncul Postgres version = BERHASIL!
```

### 5f. PgBouncer Transaction Pooling (Prisma butuh ini)

```bash
# 1. Backup + generate userlist.txt (pgbouncer auth)
echo '"hmsdp_app" "PLACEHOLDER_MD5_PASSWORD"' | sudo tee /etc/pgbouncer/userlist.txt
# 2. Generate MD5 password format pgbouncer:
DB_PASS="$HMSDP_PASS"  # ambil dari step 5a
PG_MD5="md5$(echo -n "${DB_PASS}hmsdp_app" | md5sum | awk '{print $1}')"
sudo sed -i "s|PLACEHOLDER_MD5_PASSWORD|$PG_MD5|" /etc/pgbouncer/userlist.txt
sudo chmod 600 /etc/pgbouncer/userlist.txt && sudo chown postgres:postgres /etc/pgbouncer/userlist.txt

# 3. Config pgbouncer.ini:
sudo tee /etc/pgbouncer/pgbouncer.ini <<EOF
[databases]
hmsdp = host=/var/run/postgresql port=5432 dbname=hmsdp

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
unix_socket_dir = /var/run/postgresql
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction              # PRISMA WAJIB transaction mode!
max_client_conn = 500
default_pool_size = 8
reserve_pool_size = 4
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
log_connections = 0
log_disconnections = 0
ignore_startup_parameters = extra_float_digits
EOF

# 4. Enable & restart PgBouncer
sudo systemctl enable --now pgbouncer
sudo ss -tlnp | grep pgbouncer       # expected: 127.0.0.1:6432 LISTEN
# Test koneksi via pgbouncer:
psql "host=127.0.0.1 port=6432 user=hmsdp_app dbname=hmsdp" -c "SELECT 1 AS pgbouncer_ok;"
```

---

## STEP 6 — Dependencies + Prisma Migrate Deploy + Build Pipeline

```bash
cd /var/www/hmsdp
# 6.1 Install dependencies (devDeps WAJIB: vite/typescript/esbuild dipakai build:vps)
NODE_ENV=development npm ci
# Catatan: Jika error ENOMEM OOM: Jalankan ulang sampai 3x. Jika tetap, jalankan sambil htop — jika swap >50% terpakai = butuh upgrade KVM4.

# 6.2 Prisma generate client
npx prisma@6.4.1 generate

# 6.3 Apply ALL migrations ke self-host DB
export $(grep -E '^(DATABASE_URL|DIRECT_URL)' .env | xargs)
npx prisma@6.4.1 migrate deploy
# ✅ Expected output: "All migrations applied successfully"
# ❌ Jika ERROR:
#   - Jika "42P01 relation does not exist" → cek extension pgcrypto di-load?
#   - Jika "P2024 Timed out fetching a connection from pool" → connection_limit di DATABASE_URL naik dari 3 ke 4
npx prisma@6.4.1 migrate status     # Semua migration status Applied + PENDING = 0

# 6.4 Seed initial admin user
npx prisma@6.4.1 db seed

# 6.5 Build dual: frontend Vite + backend tsc (server output dist-server + client dist)
npm run build:vps
# ✅ Expected:
#   ✓ built in Xs  (vite)
#   tsc -p tsconfig.server.json 0 errors (typecheck), lalu esbuild bundle
# ls dist-server/  →  server.js + server.js.map
# ls dist/         →  index.html + assets/
```

---

## STEP 7 — Nginx Reverse Proxy Config + SSL Certbot

```bash
# 7.1 Copy template nginx vhost
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/hmsdp.conf
# 7.2 Ganti placeholder domain dengan domain Anda:
DOMAIN="your-domain.com"
sudo sed -i "s|YOUR-DOMAIN.COM|$DOMAIN|g; s|/var/www/app|/var/www/hmsdp|g" /etc/nginx/sites-available/hmsdp.conf
# 7.3 Enable vhost:
sudo ln -sfn /etc/nginx/sites-available/hmsdp.conf /etc/nginx/sites-enabled/hmsdp.conf
sudo rm -f /etc/nginx/sites-enabled/default
# 7.4 Test syntax:
sudo nginx -t
# ✅ Expected: nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# ✅ Expected: nginx: configuration file /etc/nginx/nginx.conf test is successful
sudo systemctl reload nginx

# 7.5 SSL Let's Encrypt via Certbot (auto-config https + redirect)
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -m your-email@your-domain.com --agree-tos --redirect
# ✅ Verifikasi SSL Grade A+: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN
```

---

## STEP 8 — Start App via PM2 + Health Check

```bash
cd /var/www/hmsdp

# 8.1 Jalankan via ecosystem.config.js
pm2 start ecosystem.config.js --env production
pm2 logs hmsdp-absenyura --lines 80 --nostream
# ✅ Expected logs lines dalam 30 detik:
#   [Server] Cron jobs started
#   Server ready on port 3001
#   (TIDAK ADA stacktrace Error)

# 8.2 PM2 persistence (survive reboot VPS)
pm2 save

# 8.3 Health check 3 endpoint kritis:
#     (a) Via 127.0.0.1:3001 langsung
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3001/api/status
# Expected: HTTP 200

#     (b) Via Nginx HTTPS domain (SSL handshake)
curl -sSfI "https://$DOMAIN/api/status" | head -1
# Expected: HTTP/2 200

#     (c) Sitemap canonical URL = YOUR DOMAIN (bukan vercel.app)
curl -s "https://$DOMAIN/sitemap.xml" | grep -oE '<loc>[^<]+' | head -3
# Expected: <loc>https://your-domain.com  (BUKAN https://hmsdp.vercel.app!)
```

---

## STEP 9 — Setup Cron Jobs (5 Crons: Lifecycle App + Backup DR)

```bash
# Pastikan CRON_SECRET di .env TERISI.
source .env
CRON_URL_SECRET="https://127.0.0.1/api/cron/trigger?X-Cron-Secret=$CRON_SECRET"
# (Atau pakai domain full https://$DOMAIN/api/cron/trigger?X-Cron-Secret=...)

# Edit crontab user deploy:
crontab -e
# ====================== PASTE BARIS BERIKUT KE CRONTAB ======================
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# C1: Session lifecycle (UPCOMING → ACTIVE → CLOSED). Setiap menit.
* * * * *  curl -skS --max-time 30 -H "X-Cron-Secret: $CRON_SECRET" "https://127.0.0.1/api/cron/trigger?job=daily" >> /var/log/hmsdp/cron-lifecycle.log 2>&1

# C2: Nonce cleanup 2 jam sekali (ChallengeNonce > 10 menit + IdempotencyKey > 24 jam)
0 */2 * * * curl -skS --max-time 30 -H "X-Cron-Secret: $CRON_SECRET" "https://127.0.0.1/api/cron/trigger?job=nonce_cleanup" >> /var/log/hmsdp/cron-nonce.log 2>&1

# C3: Foto cleanup (bukti absen / excuse > 7 hari) setiap 24 jam jam 2 pagi WITA
0 2 * * *   curl -skS --max-time 30 -H "X-Cron-Secret: $CRON_SECRET" "https://127.0.0.1/api/cron/trigger?job=storage_cleanup" >> /var/log/hmsdp/cron-storage.log 2>&1

# C4: Update semester otomatis setiap 1 bulan (1 januari & juli jam 3 pagi)
0 3 1 1,7 * curl -skS --max-time 30 -H "X-Cron-Secret: $CRON_SECRET" "https://127.0.0.1/api/cron/trigger?job=semester_start" >> /var/log/hmsdp/cron-semester.log 2>&1

# C5: Disaster Recovery Backup setiap 6 jam (00:00, 06:00, 12:00, 18:00 UTC)
0 */6 * * *  sudo -u postgres bash /var/www/hmsdp/scripts/vps-backup.sh cron >> /var/log/hmsdp/backup-cron.log 2>&1
# =========================================================================

# Verifikasi crontab tersimpan:
crontab -l | wc -l     # expected: 11 baris (5 cron job + header)
```

---

## STEP 10 — 72 Jam Burn-in Load Test (Opsional, tapi HIGHLY RECOMMENDED sebelum launch 1000 user)

Jalankan dari LAPTOP client (BUKAN dari VPS sendirian, tidak merepresentasikan latency sebenarnya).

```bash
# Di laptop client:
npm install -g artillery
cat > loadtest-checkin.yml <<'EOF'
config:
  target: "https://YOUR-DOMAIN.COM"
  phases:
    - duration: 60, arrivalRate: 100, name: "Puncak 100 user scan QR"
scenarios:
  - flow:
    - get: { url: "/api/status", name: "health" }
EOF
artillery run loadtest-checkin.yml --output hmsdp-loadreport.json
artillery report hmsdp-loadreport.json
```

✅ **Acceptance p95 < 2000 ms** (jika > 3000 ms = perlu pre-aggregation stats DailyAttendanceSummary — buat tiket followup).

---

## STEP 11 — FINAL 25-TIKET SMOKE TEST PRE-LAUNCH ✅ / ❌

Buka browser incognito mode. Untuk tiap tiket, isi status `✅ PASS` atau `❌ FAIL + catatan error`. **JIKA ADA 1 PUN FAIL, JANGAN LAUNCH.** Perbaiki FAIL dulu, baru deploy full user.

| ID  | Test Case                                                      | Expected Result                                                                                                        | Status |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| T01 | Buka `https://your-domain.com/` → Public site home             | Loading ≤ 2s, brand HM SDP tampil, favicon load                                                                        | ☐      |
| T02 | `/sitemap.xml` → canonical URL = your-domain.com               | Tidak ada link ke vercel.app                                                                                           | ☐      |
| T03 | Not found random page: `/random-xyz-123456` → branded 404 page | BUKAN default Vercel 404, tampil logo + back to home                                                                   | ☐      |
| T04 | `/login` page load → render form email/password                | Tidak ada error JS console (F12)                                                                                       | ☐      |
| T05 | Login sebagai SuperAdmin via creds .env                        | Berhasil redirect /dashboard, JWT cookie httpOnly set                                                                  | ☐      |
| T06 | Dashboard charts loading skeleton → render data                | Grafik BUKAN terdistorsi (proporsional 16:9, CLS=0)                                                                    | ☐      |
| T07 | Dashboard jumlah mahasiswa x kelas                             | Tidak ada NaN / undefined                                                                                              | ☐      |
| T08 | Menu Users → list users load                                   | 1 SuperAdmin, 1 Admin, 1 ContentAdmin muncul                                                                           | ☐      |
| T09 | Buat 1 kelas DummyTest (semester aktif)                        | CREATE sukses, redirect detail kelas                                                                                   | ☐      |
| T10 | Enroll 10 user DUMMY ke kelas DummyTest                        | 10 user masuk enrollment list                                                                                          | ☐      |
| T11 | Buat session check-in 1 jam DummyTest                          | Session status = UPCOMING, QR code generate                                                                            | ☐      |
| T12 | Scan QR session DummyTest via 10 user                          | 10/10 status = HADIR, location + photo upload success ≤ 2 detik per user                                               | ☐      |
| T13 | Export laporan attendance DummyTest XLSX                       | Download file, open di Excel row count = 10                                                                            | ☐      |
| T14 | Export laporan attendance PDF                                  | PDF render, tidak ada layout broken                                                                                    | ☐      |
| T15 | Cron session lifecycle trigger manual                          | curl dengan header X-Cron-Secret → status code 200, session state changes dari UPCOMING → CHECKIN_OPEN                 | ☐      |
| T16 | Cron nonce cleanup trigger manual                              | Status 200, log cleanup count row                                                                                      | ☐      |
| T17 | Cron storage cleanup trigger manual                            | Status 200                                                                                                             | ☐      |
| T18 | Logout SuperAdmin → cookie dihapus                             | Redirect /login, tidak bisa akses /dashboard sebelum login                                                             | ☐      |
| T19 | Login 1 user biasa, scan QR DummyTest                          | Attendance count naik 1                                                                                                | ☐      |
| T20 | Upload bukti excuse DummyTest 1 user (izin sakit)              | ExcuseRequest status PENDING muncul di reviewer Admin                                                                  | ☐      |
| T21 | Approve excuse request Admin                                   | Status APPROVED, attendance berubah dari ALFA → IJIN                                                                   | ☐      |
| T22 | Public site `/berita` (jika pakai CMS seed)                    | Post list tampil, gambar lazy load                                                                                     | ☐      |
| T23 | Public site `/about` / visimisi / struktur                     | Tidak ada broken link gambar                                                                                           | ☐      |
| T24 | Check UFW external dari IP rumah (nmap -Pn IP -p1-65535)       | Hanya port 22 / 80 / 443 open (5432 / 6432 / 3001 DROPPED)                                                             | ☐      |
| T25 | DR Manual test backup + restore (jalankan sebagai postgres)    | `sudo -u postgres bash scripts/vps-backup.sh && sudo -u postgres bash scripts/vps-restore-test.sh` → kedua exit code 0 | ☐      |

---

## STEP 12 — (Jika Perlu) Data Migration dari Supabase Existing ke Self-Host

Baca dokumen terpisah: [SELFHOST_CUTOVER_PLAN.md](file:///c:/Users/shink/Pictures/absenyura/deploy/SELFHOST_CUTOVER_PLAN.md)
Window cutover = 2 jam, maintenance mode.

---

## 🚨 TROUBLESHOOTING UMUM

### Masalah: `prisma migrate deploy` error `P2024 pool connection timeout`

```bash
# Perbaikan singkat:
# 1. Cek pgbouncer jalan: systemctl status pgbouncer
# 2. Ubah DATABASE_URL connection_limit dari 3 → 4 (jangan >5!)
# 3. sudo pg_ctlcluster 16 main reload
```

### Masalah: OOM ketika npm ci — `Cannot allocate memory`

```bash
# 1. Pastikan swapfile 3G aktif (swapon --show).
# 2. Tambah swapfile sementara 2 GB sebelum build, lalu hapus.
fallocate -l 2G /tmp/swap-tmp; chmod 600 /tmp/swap-tmp; mkswap /tmp/swap-tmp; swapon /tmp/swap-tmp
# 3. npm ci lagi → selesai, hapus swapfile tmp:
swapoff /tmp/swap-tmp; rm /tmp/swap-tmp
```

### Masalah: Postgres gagal start after config override

```bash
# Cek journal log error line terakhir:
sudo journalctl -u postgresql@16-main.service -n 60 --no-pager
# Paling sering:
#   - OOMScoreAdjust typo → cek /etc/systemd/system/postgresql@16-main.service.d/override.conf baris OOMScoreAdjust=-900 (TIDAK ADA spasi = -900, BUKAN - 900)
#   - shared_buffers too big → 8GB → jangan set > 2GB
```

### Masalah: pgbouncer auth md5 FAIL

```bash
# Root cause: md5 hash tidak sama dengan yang di-generate. Regenerate:
DB_PASS="PASSWORD_SAMA_DOTENV"
PG_MD5="md5$(echo -n "${DB_PASS}hmsdp_app" | md5sum | awk '{print $1}')"
echo "\"hmsdp_app\" \"$PG_MD5\"" | sudo tee /etc/pgbouncer/userlist.txt
sudo systemctl restart pgbouncer
```

### Masalah: 502 Bad Gateway Nginx upstream (Node.js mati / OOM)

```bash
# Cek app: pm2 status ; pm2 logs hmsdp-absenyura --lines 50
# Jika OOM restarted banyak kali (>5x sehari):
#   - Kurangi build:vps yang berjalan paralel
#   - Tambah swap 1 GB
#   - Atau instance lanjutan: ganti --max-old-space-size=1536 → 1408
```

---

## 📅 Tindak Lanjut Setelah Deploy

1. Sign-off checklist prelaunch → simpan document `deploy/VPS_PRELAUNCH_AUDIT_CHECKLIST.md`
2. Baca Playbook Operasional: [VPS_OPS_PLAYBOOK.md](file:///c:/Users/shink/Pictures/absenyura/docs/VPS_OPS_PLAYBOOK.md)
3. Setup monitoring opsional: NewRelic / UptimeRobot (gratis) untuk uptime domain
