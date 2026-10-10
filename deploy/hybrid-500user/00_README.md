# 🚀 HMSDP DEPLOY HYBRID — 500 USER SUPABASE FREE + VPS HOSTINGER KVM2

Folder ini = **RINGKASAN SHORTCUT** deploy untuk skala 500 mahasiswa aktif.
Tidak perlu baca 8000 baris full guide. Cukup ikuti **file 01 → 11 BERURUTAN**.

---

## 🗂️ URUTAN BACA FILE (WAJIB BERURUTAN JANGAN LONCAT)

| Urut | File                           | Estimasi Waktu        | Yang dilakukan                                                        |
| ---- | ------------------------------ | --------------------- | --------------------------------------------------------------------- |
| 0️⃣   | `00_README.md` (INI)           | 2 menit               | Pahami scope, arsitektur hybrid                                       |
| 1️⃣   | `01_PREORDER_VPS.md`           | 10 menit              | Order Hostinger KVM2 Singapura                                        |
| 2️⃣   | `02_SUPABASE_OPTIMIZE.sql`     | 15 menit              | Paste SQL ke Supabase Editor + buat Cron Supabase                     |
| 3️⃣   | `03_DNS_CLOUDFLARE.md`         | 10 menit              | Tambah A record domain + Cloudinary + Backblaze                       |
| 4️⃣   | `04_VPS_PREFLIGHT.md`          | 5 menit               | SSH root → jalankan preflight.sh → pastikan 0 FAIL                    |
| 5️⃣   | `05_INSTALL_STACK.sh`          | 20 menit              | Copy paste 1x bash → install Node22/PM2/Nginx/Certbot/rclone otomatis |
| 6️⃣   | `06_ENV_TEMPLATE.env`          | 10 menit              | Copy ke VPS `/var/www/hmsdp/.env` → isi 10 slot secret                |
| 7️⃣   | `07_DEPLOY_APP.md`             | 15 menit              | Clone repo → install deps → migrate → build → PM2 start               |
| 8️⃣   | `08_NGINX_SSL.md`              | 15 menit              | Setup vhost Nginx → Certbot LetsEncrypt SSL A+                        |
| 9️⃣   | `09_CRONJOBS_SETUP.md`         | 10 menit              | Verifikasi job in-process + backup cron                               |
| 🔟   | `10_SMOKE_TEST.md`             | 30 menit              | 20 tiket smoke test pass 19/20 minimum                                |
| 1️⃣1️⃣ | `11_MAINTENANCE_CHEATSHEET.md` | Baca 2 menit → simpan | 5 command harian + 7 command emergency 2 menit diagnose               |

---

## 🏗️ ARSITEKTUR HYBRID 500 USER

```
PENGGUNA (Mahasiswa/Dosen/Admin)
└── Browser HTTPS hmsdp-xxx.ac.id (frontend + /api di 1 domain — WAJIB domain sendiri, *.vercel.app tidak bisa dipindah)
    └── Cloudflare DNS A record (TTL 60s)
        └── VPS HOSTINGER KVM 2 SINGAPORE (8GB / 2vCPU / 100GB NVMe)
            ├── Nginx reverse proxy port 443 TLS1.3
            ├── Node.js v22 PM2 1 process (heap 1536 MB)
            ├── Job lifecycle sesi in-process (node-cron di dalam PM2, 1 instance)
            ├── vps-backup.sh → pg_dump Supabase → rclone Backblaze B2
            └── Foto upload → Cloudinary Free Tier (JANGAN simpan ke DB!)
                └── Query Prisma Pooler TLS
                    └── SUPABASE FREE SG REGION (Rp 0 / bln)
                        ├── PostgreSQL 15/17 500MB storage (pg_dump client harus >= versi ini)
                        ├── PgBouncer pooler 60 conn (build-in)
                        ├── Free plan: TIDAK ada backup otomatis → vps-backup.sh WAJIB
                        ├── Free plan: project di-pause jika 7 hari tanpa aktivitas
                        └── Weekly cron cleanup logs (QUERY 2)
```

---

## 💰 TOTAL COST SELAMA 18 BULAN PERTAMA

| Item                                | Biaya / bulan                             |
| ----------------------------------- | ----------------------------------------- |
| VPS Hostinger KVM 2 SG              | Rp 155.900                                |
| Supabase Free Tier                  | Rp 0 (sampai storage > 400 MB ≈ 16 bulan) |
| Cloudinary Free Tier 25 GB          | Rp 0                                      |
| Backblaze B2 Free Tier 10 GB backup | Rp 0                                      |
| Cloudflare DNS SSL CDN              | Rp 0                                      |
| Domain .ac.id / .com                | Rp ~15.000 / tahun (sudah punya?)         |
| **TOTAL / bulan**                   | **Rp 155.900** 🎉                         |

---

## ❓ KAPAN UPGRADE SUPABASE PRO?

JANGAN upgrade cepat-cepat. Tunggu SAMPAI 2 metrik ini TERCAPAI 80%:

1. Dashboard Supabase → Settings → Usage → **Database Storage > 400 MB** (80% dari 500 MB free)
2. Dashboard Supabase → Settings → Usage → **Egress bulan ini > 4 GB** (80% dari 5 GB free)

Jika Cloudinary aktif + query 2 cleanup cron berjalan:

- Prediksi storage penuh = **Bulan ke 16** (1 tahun 4 bulan)
- Sebelum tanggal itu: GRATIS! 🎊
