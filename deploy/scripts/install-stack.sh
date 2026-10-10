#!/usr/bin/env bash
# ==============================================================================
# install-stack.sh — SEMI-AUTO INSTALL SOFTWARE VPS (APP) UNTUK MODE VPS + SUPABASE
#
# CARA PAKAI (root, lihat deploy/README.md langkah 3):
#   git clone https://github.com/Korumisa/absenyura.git /root/absenyura
#   bash /root/absenyura/deploy/scripts/install-stack.sh
#
# Estimasi jalan: 15-20 menit (tergantung jaringan SG).
#
# YANG DI-INSTALL:
#   ✅ Node.js 22.x LTS PPA official nodesource (bukan apt default v12!)
#   ✅ npm global: pm2 (prisma/typescript/esbuild dari node_modules repo)
#   ✅ Nginx (repo Ubuntu) + postgresql-client-17 (pg_dump backup Supabase, repo PGDG)
#   ✅ Certbot (LetsEncrypt standalone + nginx plugin)
#   ✅ rclone 1.65+ (untuk backup pg_dump → Backblaze B2)
#   ✅ htop iotop vnstat iftop sysstat ncdu pv (diagnostik ops)
#   ✅ curl wget ca-certificates gnupg lsb-release (utils dasar)
#   ✅ Swapfile 3 GB (OTOMATIS, jika belum ada)
#   ✅ Kernel PostgreSQL tuning: vm.swappiness=1, vm.dirty_ratio=10, THP disable
#   ✅ UFW allow 22 80 443 (DEFAULT DENY INCOMING YANG LAIN!)
#   ✅ User deploy (bukan root jalankan app), folder /var/www/hmsdp
#   ✅ Symlink persistent ./uploads dan ./logs (jangan masuk git pull wipe)
#   ✅ Systemd timezone Asia/Makassar (WITA = UTC+8, Singapura sama WITA)
# ==============================================================================
set -o errexit -o nounset -o pipefail

# ---- WARNA TERMINAL ---------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YEL='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO ]${NC} $*"; }
warn()  { echo -e "${YEL}[WARN ]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL ]${NC} $*"; exit 1; }

# ---- 0. PRECHECK ROOT -------------------------------------------------------
[[ $EUID -ne 0 ]] && fail "JALANKAN DENGAN ROOT! (sudo bash $0)"

# ---- 1. SET TIMEZONE WITA (SG = UTC+8 sama dengan WITA) ---------------------
info "1/10 — Setting timezone Asia/Makassar (UTC+8 = WITA / SG)"
timedatectl set-timezone Asia/Makassar || warn "TZ set gagal, lanjutkan..."
timedatectl status | head -3

# ---- 2. APT UPDATE + BASE UTIL ---------------------------------------------
info "2/10 — apt update + install base util"
apt update -y
apt install -y ca-certificates curl wget gnupg lsb-release software-properties-common \
               htop iotop vnstat iftop sysstat ncdu pv jq zip unzip net-tools \
               acl bash-completion

# ---- 3. SWAPFILE 3 GB (JIKA BELUM ADA) -------------------------------------
info "3/10 — Setup Swapfile 3 GB (OOM safety)"
if ! swapon --show 2>/dev/null | grep -q 'file\|partition'; then
  fallocate -l 3G /swapfile  || fail "fallocate 3GB gagal (disk kurang?)"
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  info "   Swapfile 3G diaktifkan + fstab entry ditambah."
else
  warn "   Swap sudah ada: $(swapon --show=size --noheadings). Lewati."
fi

# ---- 4. KERNEL PARAMETER DB FRIENDLY + DISABLE THP -------------------------
info "4/10 — Kernel param tuning (swappiness 1, dirty_ratio 10, THP disabled)"
cat >> /etc/sysctl.conf <<'EOF'
# HMSDP Hybrid 500 User — PostgreSQL friendly + NVMe IO
vm.swappiness = 1
vm.dirty_ratio = 10
vm.dirty_background_ratio = 3
vm.overcommit_memory = 0
fs.file-max = 1048576
net.core.somaxconn = 8192
net.ipv4.tcp_fin_timeout = 15
EOF
sysctl -p || warn "sysctl -p ada warning, lanjutkan."

# Disable Transparent HugePages (Postgres intermittent latency spike 200-500ms!)
cat > /etc/systemd/system/disable-thp.service <<'EOF'
[Unit]
Description=Disable Transparent Huge Pages (THP)
Before=multi-user.target
[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled && echo never > /sys/kernel/mm/transparent_hugepage/defrag'
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now disable-thp
info "   THP disable.service aktif boot time."

# ---- 5. INSTALL NODE 22.x LTS NODESOURCE OFFICIAL --------------------------
info "5/10 — Install Node.js 22.x LTS + npm global (PPA NodeSource)"
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
apt update -y
apt install -y nodejs
node --version | grep -q 'v22\.' || fail "Node 22 tidak ke-install! $(node --version)"
npm --version

info "   npm install global: pm2 (prisma/typescript/esbuild dipakai dari node_modules repo)"
npm install -g pm2@latest
pm2 --version

# ---- 6. INSTALL NGINX (repo Ubuntu) + pg_dump CLIENT (PGDG) ----------------
info "6/10 — Install Nginx + postgresql-client-17 (pg_dump untuk backup Supabase)"
apt install -y nginx
nginx -v
# pg_dump harus >= versi major Postgres Supabase (project baru = 17). Repo Ubuntu hanya punya 14/16.
install -d /usr/share/postgresql-common/pgdg
curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt update -y
apt install -y postgresql-client-17
pg_dump --version

# ---- 7. INSTALL CERTBOT LETSENCRYPT ----------------------------------------
info "7/10 — Install certbot + nginx plugin snap (Ubuntu 22.04 default certbot versi lama)"
apt remove -y certbot 2>/dev/null || true
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot
certbot --version

# ---- 8. INSTALL RCLONE LATEST (B2 BACKUP) ----------------------------------
info "8/10 — Install rclone latest (Backblaze B2 upload dump)"
curl -fsSL https://rclone.org/install.sh | bash || warn "rclone sudah versi terbaru / install ulang dilewati."
rclone --version

# ---- 9. UFW FIREWALL — DEFAULT DENY, ALLOW SSH 22 RATE LIMIT + 80 443 ------
info "9/10 — Config UFW firewall: DEFAULT DENY INCOMING"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw limit 22/tcp  comment 'SSH rate limit 6/30s brute force'
ufw allow 80/tcp   comment 'Nginx HTTP (LetsEncrypt ACME challenge)'
ufw allow 443/tcp  comment 'Nginx HTTPS TLS1.3'
# Explicit DENY public yang TIDAK BOLEH keluar
ufw deny 5432/tcp  comment 'Postgres — HANYA SUPABASE, JANGAN PERNAH BUKA PORT LOCAL KE PUBLIC'
ufw deny 6432/tcp  comment 'PgBouncer local'
ufw deny 3000/tcp  comment 'Node app dev port — PROD pakai 443 via Nginx'
ufw deny 3001/tcp  comment 'Node app alt dev port'
ufw --force enable
ufw status numbered
info "   Firewall aktif. Hanya 22,80,443 yang open public."

# ---- 10. BUAT USER deploy + FOLDER /var/www/hmsdp --------------------------
info "10/10 — Buat user deploy + folder app persistent"
if ! id deploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash deploy
  usermod -aG sudo deploy
  # Password deploy = di-set nanti manual oleh user (sudo passwd deploy)
  info "   User deploy dibuat. Set password nanti: sudo passwd deploy"
fi
mkdir -p /var/www/hmsdp/{uploads,logs,node_modules}
chown -R deploy:deploy /var/www/hmsdp
chmod 755 /var/www
chmod 700 /home/deploy

# Symlink ./uploads ke luar repo (SAFE saat git pull hard reset)
ln -sf /var/www/hmsdp/uploads /var/www/hmsdp/uploads-persistent 2>/dev/null || true

# ==============================================================================
echo
echo "═══════════════════════════════════════════════════════════════════"
echo "  ✅ INSTALL_STACK.sh SELESAI. Reboot disarankan 1x."
echo "═══════════════════════════════════════════════════════════════════"
echo
echo "  Langkah selanjutnya:"
echo "   1. Reboot VPS → systemctl reboot"
echo "   2. Setelah 60 detik → SSH lagi: ssh deploy@103.xxx.xxx.xxx"
echo "   3. Lanjut deploy/README.md langkah 4 (clone repo sebagai user deploy)"
echo
