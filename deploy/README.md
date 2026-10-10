# Deploy HM SDP E-Absensi — VPS + Supabase

Jalur utama produksi: **aplikasi di 1 VPS**, **database tetap di Supabase**. Domain contoh di panduan
ini `hmsdp.me` — domain lain cukup ganti di `.env` + nginx (lihat [Ganti domain](#ganti-domain)).

```
Browser ──HTTPS──> Nginx (VPS :443) ──> Node/Express PM2 (127.0.0.1:3001) ──> Supabase Postgres (session pooler :5432)
                                              │                                      │
                                              ├── foto/dokumen ──> Cloudinary         └── pg_dump tiap 6 jam ──> Backblaze B2
                                              └── cron in-process (sesi, auto-alfa, cleanup)
```

| Komponen       | Layanan                                                         | Biaya              |
| -------------- | --------------------------------------------------------------- | ------------------ |
| VPS            | Hostinger KVM 2, Indonesia (Jakarta), Ubuntu 22.04              | ± Rp155.900/bulan  |
| Database       | Supabase Free, Singapura (project yang sudah ada)               | Rp0                |
| Foto & dokumen | Cloudinary Free                                                 | Rp0                |
| Backup         | Backblaze B2 (10 GB gratis)                                     | Rp0                |
| Domain         | `hmsdp.me` atau alternatif di [Pilihan domain](#pilihan-domain) | tergantung pilihan |

## Isi folder

```
deploy/
├── README.md                 ← panduan ini
├── SMOKE_TEST.md             ← 20 tiket wajib sebelum go-live
├── OPERATIONS.md             ← cek harian/bulanan + skenario darurat
├── env/production.env.example
├── nginx/hmsdp.conf
├── scripts/
│   ├── install-stack.sh      ← Node 22, PM2, Nginx, certbot, rclone, pg_dump 17, UFW, swap
│   ├── preflight.sh          ← cek hardware/OS sebelum install
│   ├── backup.sh             ← pg_dump Supabase → B2
│   └── restore-test.sh       ← uji restore penuh (mode self-host)
├── supabase/optimize.sql     ← index + retensi data untuk Free tier
├── alt/                      ← alternatif: Apache vhost, systemd unit (pengganti PM2)
└── selfhost/                 ← opsi lain: Postgres juga di VPS (bukan jalur utama)
```

Konvensi path di VPS: repo di `/var/www/hmsdp/repo`, data persisten di `/var/www/hmsdp/{.env,uploads,logs}`.

---

## Langkah 0 — Prasyarat (sebelum bayar VPS)

- [ ] Akses dashboard Supabase project produksi (Connection string + SQL Editor).
- [ ] Akses Vercel project (untuk menyalin Environment Variables Production).
- [ ] Domain sudah dibeli/didapat dan bisa diatur DNS-nya.
- [ ] Akun Cloudinary dan Backblaze B2 (gratis).
- [ ] SSH key di laptop (`ssh-keygen -t ed25519` jika belum ada).
- [ ] Branch berisi folder `deploy/` ini sudah di-merge ke `main`.

## Langkah 1 — Order VPS

Hostinger → VPS → **KVM 2** → lokasi **Indonesia** → OS **Ubuntu 22.04 LTS** (plain, tanpa panel).
Saat setup, tempel public key SSH (`~/.ssh/id_ed25519.pub`). Catat **IP VPS**.

**VPS Indonesia + Supabase Singapura — aman.** Jarak Jakarta–Singapura ±15-30 ms per query, jauh
lebih dekat dari region lain, dan user (mahasiswa) mendapat respons halaman lebih cepat karena VPS
di Indonesia. Agar latensi lintas negara tidak menumpuk:

- Pakai **Session pooler `:5432`** (bukan transaction `:6543`) — koneksi tetap hidup, prepared
  statement aktif, round trip per query lebih sedikit.
- `connection_limit=10` (di bawah batas ±15 klien Supabase Free) dan PM2 tetap **1 instance**.
- Uji beban (simulasi VPS dari jaringan rumah, latensi ±65 ms — lebih buruk dari VPS asli):
  50 check-in serentak 100% sukses (±4 detik), 200 serentak 100% sukses (±20 detik antre).
  Absen yang menyebar beberapa menit (kondisi nyata) jauh di bawah batas ini.

Batas Supabase Free yang perlu dipantau: database 500 MB, project di-pause setelah 7 hari **tanpa
aktivitas** (tidak terjadi bila app dipakai harian), tanpa backup otomatis (ditangani langkah 8).

## Langkah 2 — Domain, DNS & layanan pendukung

**DNS** (di Cloudflare atau DNS manager registrar):

| Type  | Name  | Content    | Proxy              |
| ----- | ----- | ---------- | ------------------ |
| A     | `@`   | IP VPS     | DNS only (abu-abu) |
| CNAME | `www` | `hmsdp.me` | DNS only           |

Proxy Cloudflare (oranye) baru boleh dinyalakan **setelah** SSL terbit di langkah 7, dengan mode SSL **Full (strict)**.
Cek propagasi dari laptop: `nslookup hmsdp.me` → harus IP VPS.

**Supabase**: SQL Editor → jalankan [`supabase/optimize.sql`](supabase/optimize.sql) (index + retensi; bagian bawah
berisi jadwal cron mingguan). Catat 3 connection string dari Project Settings → Database:
Transaction pooler `:6543`, Direct `:5432`, Session pooler `:5432`.

**Cloudinary**: Settings → Access Keys → salin `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`.

**Backblaze B2**: buat bucket **Private** (mis. `hmsdp-backup`), lalu Application Key khusus bucket itu
(Read & Write). Catat `keyID` dan `applicationKey` — dipakai di langkah 8.

## Langkah 3 — Setup server (sebagai root)

```bash
ssh root@IP_VPS
apt update && apt install -y git
git clone https://github.com/Korumisa/absenyura.git /root/absenyura
bash /root/absenyura/deploy/scripts/preflight.sh        # tidak boleh ada [FAIL]
bash /root/absenyura/deploy/scripts/install-stack.sh    # 15-20 menit

# Izinkan login SSH sebagai user deploy dengan key yang sama
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
passwd deploy                                           # password untuk sudo
reboot
```

Repo private? Pakai `git clone git@github.com:Korumisa/absenyura.git` dengan deploy key read-only.

## Langkah 4 — Clone repo (sebagai deploy)

```bash
ssh deploy@IP_VPS
git clone https://github.com/Korumisa/absenyura.git /var/www/hmsdp/repo
cd /var/www/hmsdp/repo
mkdir -p /var/www/hmsdp/uploads /var/www/hmsdp/logs
ln -sfn /var/www/hmsdp/uploads ./uploads
ln -sfn /var/www/hmsdp/logs ./logs
```

## Langkah 5 — Isi `.env`

```bash
cp deploy/env/production.env.example /var/www/hmsdp/.env
chmod 600 /var/www/hmsdp/.env
nano /var/www/hmsdp/.env
ln -sfn /var/www/hmsdp/.env /var/www/hmsdp/repo/.env
grep -nE '____|<password>|<project_ref>' /var/www/hmsdp/.env   # harus kosong
```

Yang wajib diisi:

- **Domain**: `APP_URL`, `VITE_APP_URL`, `FRONTEND_URL` = `https://hmsdp.me`; `CORS_ORIGINS` = `https://hmsdp.me,https://www.hmsdp.me`.
- **Database**: `DATABASE_URL` (session pooler `:5432`, tanpa `pgbouncer=true`, `connection_limit=10`),
  `DIRECT_URL`, `BACKUP_DATABASE_URL` — pakai tanda kutip.
- **Secret**: salin `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ATTENDANCE_PROOF_SECRET`, `INTERNAL_SECRET`, `CRON_SECRET`,
  `SEED_SECRET` **dari Vercel** (jangan generate baru saat pindah).
- **Cloudinary**: `CLOUDINARY_URL`.

## Langkah 6 — Install, migrasi, build

```bash
cd /var/www/hmsdp/repo
unset NODE_ENV                 # npm ci butuh devDependencies (vite, typescript, esbuild)
npm ci
npm run db:migrate:deploy      # DB produksi: harapannya "No pending migrations to apply"
npm run build:vps              # dist-server/server.js + dist/
ls dist-server/server.js dist/index.html
```

`VITE_*` dibaca saat build — setiap ubah domain/VITE\_\*, jalankan `npm run build:vps` lagi.

## Langkah 7 — Jalankan app (PM2) + Nginx + SSL

```bash
cd /var/www/hmsdp/repo
pm2 start ecosystem.config.cjs --env production
pm2 status                                       # online, restart 0
curl -s http://127.0.0.1:3001/api/status         # {"success":true,"status":"ok"}
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy  # jalankan baris sudo yang dicetak
pm2 install pm2-logrotate

sudo cp deploy/nginx/hmsdp.conf /etc/nginx/sites-available/hmsdp.conf
sudo ln -sf /etc/nginx/sites-available/hmsdp.conf /etc/nginx/sites-enabled/hmsdp.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d hmsdp.me -d www.hmsdp.me --redirect --agree-tos -m EMAIL_ANDA
sudo certbot renew --dry-run
```

`instances` di PM2 harus tetap 1: job sesi/auto-alfa/cleanup berjalan di dalam proses app,
lebih dari 1 proses = job jalan dobel. Tidak perlu crontab untuk job aplikasi. Salinan staging/uji
yang memakai DB yang sama wajib `CRON_ENABLED=false`.

## Langkah 8 — Backup otomatis

```bash
rclone config create b2remote b2 account=B2_KEY_ID key=B2_APP_KEY
rclone lsd b2remote:                                   # bucket tampil
nano /var/www/hmsdp/.env                               # BACKUP_RCLONE_PATH=hmsdp-backup/hmsdp-db-backups
bash /var/www/hmsdp/repo/deploy/scripts/backup.sh; echo "exit=$?"   # harus exit=0
crontab -e
```

Isi crontab:

```
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
0 */6 * * * /usr/bin/bash /var/www/hmsdp/repo/deploy/scripts/backup.sh >> /var/www/hmsdp/logs/cron-backup.log 2>&1
0 3 * * 0 /usr/bin/find /var/www/hmsdp/logs -name 'cron-*.log' -type f -mtime +7 -delete
```

Supabase Free tidak punya backup otomatis — langkah ini wajib. Uji backup sebulan sekali
(bagian "Uji backup" di [OPERATIONS.md](OPERATIONS.md)).

## Langkah 9 — Smoke test

Kerjakan [SMOKE_TEST.md](SMOKE_TEST.md) (20 tiket, minimal 19 PASS). Cek cepat:

```bash
curl -sI http://hmsdp.me/ | head -1                      # 301 → https
curl -s  https://hmsdp.me/api/status                     # status ok
curl -s  https://hmsdp.me/robots.txt | grep Sitemap      # https://hmsdp.me/sitemap.xml
```

## Langkah 10 — Pindah dari Vercel

1. Vercel → Project → Settings → **Cron Jobs → Disable**. Cron harian Vercel dan cron VPS memakai DB yang sama.
2. Umumkan URL baru `https://hmsdp.me`. Cookie login per domain → semua user login ulang sekali;
   PWA yang ter-install dari domain lama perlu di-install ulang.
3. Biarkan Vercel hidup 1-2 minggu sebagai cadangan (DB sama, aman), lalu jadikan redirect ke domain baru
   atau hapus project-nya.

---

## Update aplikasi

```bash
cd /var/www/hmsdp/repo
git pull --ff-only
unset NODE_ENV && npm ci
npm run db:migrate:deploy
npm run build:vps
pm2 reload ecosystem.config.cjs --update-env
curl -s http://127.0.0.1:3001/api/status
```

Gagal setelah update → rollback di [OPERATIONS.md](OPERATIONS.md) skenario E2.

## Ganti domain

1. DNS domain baru → IP VPS (langkah 2).
2. `.env`: ubah `APP_URL`, `VITE_APP_URL`, `FRONTEND_URL`, `CORS_ORIGINS`.
3. `sudo sed -i 's/hmsdp\.me/DOMAIN-BARU/g' /etc/nginx/sites-available/hmsdp.conf && sudo nginx -t && sudo systemctl reload nginx`
4. `sudo certbot --nginx -d DOMAIN-BARU -d www.DOMAIN-BARU --redirect`
5. `npm run build:vps && pm2 reload ecosystem.config.cjs --update-env`

OG tags, `robots.txt`, dan sitemap otomatis mengikuti `APP_URL`/`VITE_APP_URL` — tidak ada domain di-hardcode.

## Pilihan domain

- **`hmsdp.me`** — `.me` berbayar per tahun; GitHub Student Developer Pack biasanya menyediakan `.me` gratis 1 tahun (Namecheap).
- **Subdomain kampus** (mis. `hmsdp.<kampus>.ac.id`) — gratis dan paling resmi; minta record A ke admin TI kampus.
- **`.my.id`** — sangat murah, butuh KTP (PANDI).
- **Subdomain gratis** (DuckDNS, eu.org) — bisa dipakai dengan certbot, tapi kurang profesional dan kontrol terbatas.
- `hmsdp.vercel.app` **tidak bisa** diarahkan ke VPS.

Domain apa pun yang dipilih, langkahnya sama: A record ke IP VPS lalu ikuti [Ganti domain](#ganti-domain).
