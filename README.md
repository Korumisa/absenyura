# 🎓 Sistem Absensi Akademik Terpadu (AbsensiWeb)

Sistem Absensi Akademik Terpadu adalah aplikasi absensi modern berbasis web yang dirancang untuk mencegah kecurangan (titip absen) menggunakan validasi 4 lapis:
1. **QR Code Dinamis** (Berubah setiap 15 detik)
2. **Validasi Geofencing (GPS)**
3. **Device & IP Fingerprinting**
4. **Foto Selfie (Bukti Kehadiran)**

Aplikasi ini dibangun menggunakan **React (Vite)** untuk Frontend, **Node.js (Express)** untuk Backend, dan **PostgreSQL** (via Supabase & Prisma) sebagai Database.

---

## 🛠️ Persyaratan Sistem (Prerequisites)
Sebelum menjalankan atau melakukan *deploy* aplikasi ini, pastikan sistem/server Anda telah menginstal:
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
Buka file `.env` di *root* direktori, dan ubah variabel berikut:
```env
PORT=3001
# Ganti [YOUR-PASSWORD] dengan password database Supabase Anda
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.nztchtwylutzkiisvrid.supabase.co:5432/postgres?pgbouncer=true"

# Ganti dengan string acak rahasia yang panjang
JWT_SECRET="ganti_dengan_rahasia_jwt_anda"
JWT_REFRESH_SECRET="ganti_dengan_rahasia_refresh_anda"

FRONTEND_URL="http://localhost:5173"
```

### 3. Migrasi Database (Prisma)
Hubungkan aplikasi ke Supabase dan buat seluruh tabel yang diperlukan dengan perintah:
```bash
npx prisma generate
npx prisma db push
```

### 4. Membuat Akun Demo (Opsional)
Agar Anda bisa login untuk pertama kalinya, jalankan skrip berikut untuk membuat 3 akun demo (Super Admin, Dosen, dan Mahasiswa):
```bash
npx tsx server/utils/seedDemo.ts
```
*(Semua akun akan memiliki password `password123`)*

### 5. Jalankan Aplikasi
Jalankan Frontend dan Backend secara bersamaan dengan perintah:
```bash
npm run dev
```
Aplikasi Frontend dapat diakses di `http://localhost:5173` (atau 5174) dan Backend di `http://localhost:3001`.

---

## 🌍 Panduan Deployment ke VPS (Production)
Sangat disarankan mendeploy aplikasi ini ke **VPS (Virtual Private Server)** seperti DigitalOcean, AWS EC2, Niagahoster, atau IDCloudHost karena aplikasi ini perlu **menyimpan foto selfie mahasiswa ke dalam folder lokal** (`/uploads/attendance`).

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
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.nztchtwylutzkiisvrid.supabase.co:5432/postgres?pgbouncer=true"
JWT_SECRET="BUAT_STRING_ACAK_YANG_SANGAT_PANJANG_DAN_RUMIT"
JWT_REFRESH_SECRET="BUAT_STRING_ACAK_YANG_SANGAT_PANJANG_DAN_RUMIT_LAINNYA"
FRONTEND_URL="https://absensi.namakampus.ac.id" # URL Asli Anda
```
Jalankan `npx prisma generate` dan `npx prisma db push`.

### Langkah 3: Build Frontend
Kompilasi kode React agar siap dilayani oleh Web Server:
```bash
npm run build
```
*(Ini akan menghasilkan folder `dist/`)*

### Langkah 4: Jalankan Backend dengan PM2
Agar backend (Node.js, WebSocket, dan Cron Jobs) tetap menyala 24/7 dan *auto-restart* jika *crash*:
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

Selamat! Sistem Absensi Anda sudah berjalan secara *Production*. 🎉

---

## 🧹 Fitur Auto-Cleanup
Aplikasi ini sudah dilengkapi dengan **Cron Job otomatis** yang berjalan setiap jam **02:00 Pagi**. Job ini akan **menghapus foto-foto selfie bukti absen yang umurnya sudah lebih dari 7 hari (1 minggu)** dari folder `/uploads/attendance` untuk menghemat ruang penyimpanan (*storage*) server Anda. Data teks kehadirannya (status, waktu, IP) akan tetap tersimpan selamanya di database.
