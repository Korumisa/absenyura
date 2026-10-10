# 🧩 07 — CLONE REPO, INSTALL, MIGRATE, BUILD, START PM2

Estimasi: 15-20 menit.

---

## A. SSH LOGIN USER deploy (BUKAN ROOT!)

Setelah reboot dari step 05:

```bash
ssh deploy@103.xxx.xxx.xxx
# atau kalau masih pakai root, ganti user:
su - deploy
cd ~
```

## B. CLONE REPO APLIKASI

Ganti URL dengan repo GitHub/GitLab Anda sendiri:

```bash
# Jika repo public:
git clone --depth=1 https://github.com/<USERNAME>/<REPO-NAME>.git /var/www/hmsdp/repo
# Jika repo private:
# git clone --depth=1 git@github.com:<USERNAME>/<REPO-NAME>.git /var/www/hmsdp/repo

# Pastikan symlink persistent ./uploads aman:
cd /var/www/hmsdp/repo
mkdir -p /var/www/hmsdp/uploads /var/www/hmsdp/logs
ln -sfn /var/www/hmsdp/uploads ./uploads
ln -sfn /var/www/hmsdp/logs ./logs
ls -la
# Harus ada: uploads -> /var/www/hmsdp/uploads (tidak merah)
```

## C. COPY .env YANG SUDAH DIISI (step 06):

```bash
# Sebagai root tadi copy ke /var/www/hmsdp/.env? Atau copy dari template:
# sudo cp deploy/hybrid-500user/06_ENV_TEMPLATE.env /var/www/hmsdp/.env
# sudo nano /var/www/hmsdp/.env → ISI SEMUA SLOT step 06.

# Setelah yakin .env LENGKAP — link ke repo root:
ln -sfn /var/www/hmsdp/.env /var/www/hmsdp/repo/.env

# PERIKSA ISI:
cat /var/www/hmsdp/repo/.env | grep -i 'change-me'
# Output KOSONG → BAGUS ✅. Kalau masih ada tulisan change-me → ADA YANG BELUM DIISI. Edit dulu.
```

## D. INSTALL DEPENDENCIES PRODUCTION

Repo memakai npm (`package-lock.json`). JANGAN export `NODE_ENV=production` sebelum install —
`npm ci` akan melewati devDependencies (vite, typescript, esbuild) dan build gagal.

```bash
cd /var/www/hmsdp/repo
unset NODE_ENV
npm ci
# Tunggu 3-7 menit.
```

## E. PRISMA MIGRATE DEPLOY KE SUPABASE

Ini mengeksekusi semua file SQL migration di folder prisma/migrations ke Supabase.
⚠️ Pastikan `DIRECT_URL` di .env TERISI benar!

```bash
cd /var/www/hmsdp/repo
npm run db:migrate:deploy
# Expected output terakhir:
#   ▸ Prisma schema loaded from prisma/schema.prisma
#   ▸ N migrations found in prisma/migrations
#   ▸ No pending migrations to apply.  (database Supabase existing sudah up to date)
#     atau "All migrations have been successfully applied." ✅
# Jika output di atas TIDAK ADA → STOP. Kirim error log ke tim teknis.
```

## F. BUILD PRODUCTION APLIKASI

```bash
cd /var/www/hmsdp/repo
npm run build:vps
# Estimasi 1-3 menit. Isinya: prisma generate → typecheck server → bundle server
# ke dist-server/server.js (esbuild) → build frontend ke dist/ (vite).
# VITE_* di .env dibaca SAAT BUILD — kalau VITE_APP_URL diubah, build ulang.
ls -la dist-server/server.js dist/index.html
# Dua file harus ada. Kalau TS error → STOP. Perbaiki error dulu di lokal PC baru push lagi.
```

## G. CEK FILE ECOSYSTEM PM2 + START APP SEKALI (dry run)

Repo root Anda sudah ada `ecosystem.config.js` (disesuaikan tadi untuk hybrid 500 user):

```bash
cd /var/www/hmsdp/repo
cat ecosystem.config.js | grep -E 'max_memory|max-old-space'
# Expected output:
#   max_memory_restart:'1500M',
#   node_args: '--max-old-space-size=1536',
# Pastikan 2 baris ini ADA. Kalau TIDAK ADA → Edit sebelum start! (keperluan guard OOM)
```

Jalankan SEKALI via PM2:

```bash
cd /var/www/hmsdp/repo
pm2 start ecosystem.config.js --env production
# Tunggu 15 detik.

# STATUS CHECK:
pm2 status
# PM2 table → status "online", restarts 0, uptime mulai hitung.

# JIKA STATUS = errored / restarted > 2:
#  pm2 logs hmsdp-absenyura --lines 200 — pastekan error nya ke tim teknis.
#  Biasanya karena .env ada yang kosong / DATABASE_URL salah format.
```

## H. PM2 STARTUP BOOT (WAJIB! Supaya app auto start kalau VPS restart)

```bash
pm2 save
# Saved process list dump...

pm2 startup systemd -u deploy --hp /home/deploy
# Akan output 1 baris command panjang seperti:
#   sudo env PATH=$PATH:... pm2 startup systemd -u deploy --hp /home/deploy
# Copy baris itu lalu paste-kan sebagai root → Enter.
```

Reboot simulasi test:

```bash
sudo systemctl reboot
# Tunggu 60 detik. Lalu SSH lagi.
ssh deploy@103.xxx.xxx.xxx
pm2 status
# status TETAP online, uptime dari baru. BAGUS! ✅
```

---

### ✅ **SELESAI — App Jalan di 127.0.0.1:3001 VPS internal. LANJUT KE [08_NGINX_SSL.md](08_NGINX_SSL.md) → Setup Reverse Proxy HTTPS 443 + LetsEncrypt SSL A+**
