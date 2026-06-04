# 🎓 Sistem Absensi Akademik Terpadu (AbsensiWeb)

Sistem Absensi Akademik Terpadu adalah aplikasi absensi modern berbasis web yang dirancang untuk mencegah kecurangan (titip absen) menggunakan validasi 4 lapis:

1. **QR Code Dinamis** (Berubah setiap 15 detik)
2. **Validasi Geofencing (GPS)**
3. **Device & IP Fingerprinting**
4. **Foto Selfie (Bukti Kehadiran)**

Aplikasi ini dibangun menggunakan **React (Vite)** untuk Frontend, **Node.js (Express)** untuk Backend, dan **PostgreSQL** (via Supabase & Prisma) sebagai Database.

---

## 🚚 Deployment (Local vs Vercel)

| Environment       | Backend entry      | How it runs                                 | Shared app      |
| ----------------- | ------------------ | ------------------------------------------- | --------------- |
| Local dev         | `server/server.ts` | `npm run dev` (Vite + Express via nodemon)  | `server/app.ts` |
| Vercel production | `api/index.ts`     | Serverless function routed by `vercel.json` | `server/app.ts` |

> **Docker:** No Dockerfile is included because this project deploys to Vercel. If you need a containerised environment, a minimal Node.js Dockerfile would go here.

## 🛠️ Persyaratan Sistem (Prerequisites)

Sebelum menjalankan atau melakukan _deploy_ aplikasi ini, pastikan sistem/server Anda telah menginstal:

- **Node.js** (Versi 18 atau yang lebih baru)
- **NPM** atau **PNPM**
- **Git**
- **PostgreSQL** (Atau akun Supabase)
- **PM2** (Untuk deployment di server VPS) -> `npm install -g pm2`

---

## 🚀 Panduan Menjalankan di Komputer Lokal (Development)

### 1. Ekstrak dan Instal Dependensi

Ekstrak file zip proyek ini, buka terminal di dalam folder proyek, lalu jalankan:

```bash
npm install
```

### 2. Konfigurasi Environment (`.env`)

Buka file `.env` di _root_ direktori, dan ubah variabel berikut:

```env
PORT=3001
# Production/Vercel: pooler port 6543 + connection_limit=1
DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Migrasi Prisma (direct) port 5432
DIRECT_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@db.[ref].supabase.co:5432/postgres"

# Ganti dengan string acak rahasia yang panjang
JWT_SECRET="ganti_dengan_rahasia_jwt_anda"
JWT_REFRESH_SECRET="ganti_dengan_rahasia_refresh_anda"

FRONTEND_URL="http://localhost:5173"
```

### 3. Migrasi Database (Prisma)

Hubungkan aplikasi ke Supabase dan buat seluruh tabel yang diperlukan dengan perintah:

```bash
npx prisma generate
npx prisma migrate dev
```

For a fresh local database without migration history, you may use `npx prisma db push` instead.

### 4. Membuat Akun Demo (Opsional)

Agar Anda bisa login untuk pertama kalinya, jalankan skrip berikut untuk membuat 3 akun demo (Super Admin, Dosen, dan Mahasiswa):

```bash
npx tsx server/utils/seedDemo.ts
```

_(Semua akun akan memiliki password `password123`)_

### 5. Jalankan Aplikasi

Jalankan Frontend dan Backend secara bersamaan dengan perintah:

```bash
npm run dev
```

Aplikasi Frontend dapat diakses di `http://localhost:5173` (atau 5174) dan Backend di `http://localhost:3001`.

---

## 🌍 Deployment Production

### Opsi A — Vercel + Cloudinary (disarankan)

Deploy utama memakai **Vercel** (frontend + API serverless). Foto selfie dan aset CMS diunggah ke **Cloudinary** — `CLOUDINARY_URL` **wajib** di production (lihat `.env.example`).

- Tidak perlu folder `/uploads/` di server
- HTTPS otomatis (wajib untuk kamera & GPS di browser)
- Cron sesi: lihat bagian [Cron status sesi](#️-cron-status-sesi-vercel-hobby--gratis) di bawah

### Opsi B — VPS + penyimpanan lokal (alternatif)

Untuk VPS (DigitalOcean, AWS EC2, Niagahoster, dll.) tanpa Cloudinary, foto selfie dapat disimpan di **`/uploads/attendance`** di disk server. Pastikan Nginx mem-proxy path `/uploads/` ke backend (contoh di bawah).

### Langkah 1: Persiapkan VPS Anda

1. Login ke VPS Anda via SSH.
2. Instal Node.js, Nginx, dan PM2.
3. Kloning atau unggah kode proyek ini ke VPS Anda (misal di folder `/var/www/absensi`).
4. Masuk ke folder tersebut dan jalankan `npm install`.

### Langkah 2: Atur Environment (`.env`)

Buat/edit file `.env` di VPS:

```env
NODE_ENV="production"
PORT=3001
DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@db.[ref].supabase.co:5432/postgres"
JWT_SECRET="BUAT_STRING_ACAK_YANG_SANGAT_PANJANG_DAN_RUMIT"
JWT_REFRESH_SECRET="BUAT_STRING_ACAK_YANG_SANGAT_PANJANG_DAN_RUMIT_LAINNYA"
ATTENDANCE_PROOF_SECRET="BUAT_STRING_ACAK_MINIMAL_32_KARAKTER_UNTUK_ABSENSI"
CRON_SECRET="BUAT_STRING_ACAK_UNTUK_CRON_HTTP"
INTERNAL_SECRET="BUAT_STRING_ACAK_INTERNAL"
FRONTEND_URL="https://absensi.namakampus.ac.id" # URL Asli Anda
```

Jalankan `npx prisma generate` dan `npx prisma migrate deploy` (production). Untuk development lokal gunakan `npx prisma migrate dev`.

### Checklist production

1. **Secrets:** `ATTENDANCE_PROOF_SECRET` (32+ byte), `CRON_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SECRET` — jangan pakai nilai contoh.
2. **Migrasi:** `npx prisma migrate deploy` (termasuk unique excuse dan `refresh_token_hash`).
3. **Proxy:** Nginx harus meneruskan `X-Forwarded-For` / `X-Real-IP` agar aturan IP absensi memakai IP klien yang benar (`trust proxy` sudah aktif di production).
4. **Cron HTTP:** Set `CRON_SECRET` di Vercel; verifikasi:
   `curl -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/trigger?job=session"`
   GitHub Actions (`session-cron.yml`) memakai header `X-Cron-Secret` setiap 15 menit sebagai cadangan.
5. **Build:** Jangan set `VITE_DEV_BYPASS_AUTH` pada build production (CI/vite akan gagal jika diset).
6. **Boot:** Aplikasi menolak start di production/Vercel tanpa `ATTENDANCE_PROOF_SECRET` yang valid.

### Debug playbook (saat ada masalah)

1. Reproduce dengan jelas: role user, URL, request (endpoint + status + response body) dari Network tab.
2. Cocokkan gejala dengan hipotesis umum:
   - Challenge/check-in 500 → `ATTENDANCE_PROOF_SECRET` hilang/kurang panjang di env production.
   - Cron selalu 404 → `CRON_SECRET` tidak diset / header salah (`Authorization: Bearer ...` atau `X-Cron-Secret`).
   - IP kampus selalu ditolak → pastikan proxy mengirim `X-Forwarded-For` dan `trust proxy` aktif.
   - Refresh token 401 setelah deploy → re-login diperlukan (hash refresh telah berubah).
   - Check-out 400 → pastikan challenge memakai `action=checkout` + `attendance_id`.
3. Tambahkan log minimal (tanpa secrets) hanya untuk branch investigasi, lalu hapus setelah fixed.
4. Validasi ulang: jalankan checklist cron + flow login/check-in/check-out setelah perubahan.

### Langkah 3: Build Frontend

Kompilasi kode React agar siap dilayani oleh Web Server:

```bash
npm run build
```

_(Ini akan menghasilkan folder `dist/`)_

### Langkah 4: Jalankan Backend dengan PM2

Agar backend (Node.js, WebSocket, dan Cron Jobs) tetap menyala 24/7 dan _auto-restart_ jika _crash_:

```bash
pm2 start npx --name "absensi-api" -- tsx server/server.ts
pm2 save
pm2 startup
```

### Langkah 5: Konfigurasi Nginx (Reverse Proxy)

Buat file konfigurasi Nginx baru (misal: `/etc/nginx/sites-available/absensi`):

```nginx
server {
    listen 80;
    server_name absensi.namakampus.ac.id; # Ganti dengan domain Anda

    # 1. Melayani Frontend (React)
    location / {
        root /var/www/absensi/dist; # Sesuaikan path-nya
        index index.html;
        try_files $uri $uri/ /index.html; # Penting untuk React Router
    }

    # 2. Melayani Backend API & WebSockets
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 3. Melayani Foto Bukti Absensi
    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/absensi /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### Langkah 6: Instalasi SSL (HTTPS) - WAJIB!

Browser **memblokir** akses Kamera dan GPS jika website Anda tidak menggunakan `https://`. Pasang SSL gratis menggunakan Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d absensi.namakampus.ac.id
```

Selamat! Sistem Absensi Anda sudah berjalan secara _Production_. 🎉

---

## ⏱️ Cron status sesi (Vercel Hobby — gratis)

Di **Vercel Hobby**, cron bawaan hanya bisa **1× per hari**. Status sesi (`UPCOMING` → `ACTIVE` → `CLOSED`) butuh pemicu lebih sering. Aplikasi memakai **beberapa lapisan** (utama + cadangan):

| Lapisan          | Pemicu                               | Frekuensi                                          |
| ---------------- | ------------------------------------ | -------------------------------------------------- |
| Utama            | [cron-job.org](https://cron-job.org) | Tiap **5 menit** (`job=session`)                   |
| Backup terjadwal | GitHub Actions                       | Tiap **15 menit** (`job=session`)                  |
| Backup harian    | Vercel Cron                          | **1×/hari** 01:00 UTC (`job=all` di `vercel.json`) |
| Backup traffic   | Lazy sync API                        | Saat buka dashboard / sesi / QR / absen            |

### 1. Set `CRON_SECRET` di Vercel

Generate secret acak (32+ byte hex), lalu tambahkan di **Vercel → Settings → Environment Variables** (Production):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Nama variabel: `CRON_SECRET`. Redeploy setelah disimpan.

### 2. Utama — cron-job.org

1. Daftar gratis di [cron-job.org](https://cron-job.org)
2. Buat cronjob baru:
   - **Title:** `Absenyura - sync session status`
   - **URL:** `https://<domain-production>/api/cron/trigger?job=session`
   - **HTTP Headers:** `Authorization: Bearer <CRON_SECRET>` (atau `X-Cron-Secret: <CRON_SECRET>`)
   - **Schedule:** Every **5 minutes**
   - **Expected:** HTTP **200**, body JSON `success: true`
3. Aktifkan **failure notification** (email) agar tahu jika pemicu gagal
4. Cek **Execution history** jika status sesi tidak berubah

Query `?key=` **tidak lagi** didukung (menghindari kebocoran secret di log).

### 3. Backup — GitHub Actions

Workflow: [`.github/workflows/session-cron.yml`](.github/workflows/session-cron.yml)

Di **GitHub → Settings → Secrets and variables → Actions**, tambahkan:

| Secret        | Contoh                                               |
| ------------- | ---------------------------------------------------- |
| `APP_URL`     | `https://your-app.vercel.app` (tanpa slash di akhir) |
| `CRON_SECRET` | Sama dengan nilai di Vercel                          |

Workflow berjalan tiap 15 menit. Tes manual: tab **Actions** → **Session cron backup** → **Run workflow**.

### 4. Backup — Vercel Cron harian

Sudah dikonfigurasi di `vercel.json`: `GET /api/cron/trigger?job=all` pada `0 1 * * *` (sync sesi tertinggal, hapus foto lama, update semester).

### 5. Verifikasi

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" "https://<domain>/api/cron/trigger?job=session"
```

Harus mengembalikan `200` dan `triggeredAt`. Tanpa header secret yang benar → `404`. Vercel Cron harian mengirim header `Authorization: Bearer` otomatis jika `CRON_SECRET` diset di project.

Buat sesi `UPCOMING` dengan `check_in_open_at` beberapa menit lalu, tunggu 5–10 menit **tanpa** membuka app → status harus menjadi **ACTIVE**.

### Troubleshooting

| Gejala                                | Yang dicek                                                              |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Status tidak berubah saat app ditutup | Execution history cron-job.org; secret `CRON_SECRET` di Vercel          |
| HTTP 404 dari cron eksternal          | `CRON_SECRET` benar; redeploy setelah ubah env                          |
| HTTP 429                              | Pastikan path `/api/cron` tidak kena rate limit (sudah di-skip di kode) |
| Hanya update saat buka app            | cron-job.org / GitHub Actions belum jalan atau secret salah             |
| Catch-up semalam                      | Vercel Cron harian di dashboard Vercel                                  |

**Lokal / VPS (PM2):** `startCronJobs()` di server tetap menjalankan interval 1 menit — tidak perlu cron-job.org.

---

## 🧹 Fitur Auto-Cleanup

Cron harian (`job=all` / `job=photo`) menghapus foto selfie bukti absen yang berumur **lebih dari 7 hari** dari penyimpanan. Data teks kehadiran (status, waktu, IP) tetap di database.
