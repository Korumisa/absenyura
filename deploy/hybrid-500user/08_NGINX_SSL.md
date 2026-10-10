# 🔐 08 — NGINX REVERSE PROXY + LETSENCRYPT SSL

Estimasi: 15 menit.

Ganti semua `DOMAIN.COM` dengan domain Anda (contoh `hmsdp.example.ac.id`).
App melayani **frontend + API di satu domain** (Express serve `dist/` + `/api/*`), jadi Nginx cukup proxy semua ke `127.0.0.1:3001`.

> Header keamanan (HSTS, CSP, X-Frame-Options, Permissions-Policy `camera=(self)`) sudah dikirim app.
> **Jangan** tambah `add_header` keamanan di Nginx — header ganda/bertabrakan bisa memblokir kamera (scan QR & foto absen).

---

## A. VHOST HTTP (sebelum SSL)

```bash
sudo nano /etc/nginx/sites-available/hmsdp.conf
```

Paste (ganti domain!):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN.COM www.DOMAIN.COM;

    server_tokens off;
    client_max_body_size 12M;     # body JSON 10 MB + multipart foto ≤ 5 MB
    client_body_timeout 60s;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript
               application/json application/xml application/manifest+json image/svg+xml;

    access_log /var/log/nginx/hmsdp-access.log;
    error_log  /var/log/nginx/hmsdp-error.log warn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Connection "";

        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Aktifkan:

```bash
sudo ln -sf /etc/nginx/sites-available/hmsdp.conf /etc/nginx/sites-enabled/hmsdp.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t          # WAJIB "test is successful"
sudo systemctl reload nginx
curl -sI http://127.0.0.1/ -H "Host: DOMAIN.COM" | head -1   # HTTP/1.1 200 OK (app harus sudah online di PM2)
```

## B. SSL LETSENCRYPT (certbot otomatis menambah blok 443 + redirect HTTP→HTTPS)

**Syarat:** DNS A record `DOMAIN.COM` (+ `www`) sudah mengarah ke IP VPS dan berstatus **DNS only (awan abu-abu)** di Cloudflare selama proses ini.

```bash
sudo certbot --nginx -d DOMAIN.COM -d www.DOMAIN.COM \
  --redirect --agree-tos -m admin@DOMAIN.COM --non-interactive

sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run      # harus "all simulated renewals succeeded"
```

Gagal `NXDOMAIN` / `Timeout during connect` → DNS belum propagasi atau port 80 tertutup (`sudo ufw status`).

## C. (OPSIONAL) CLOUDFLARE PROXY 🔶

Bisa diaktifkan setelah B berhasil, untuk proteksi DDoS. Wajib:

1. Cloudflare → SSL/TLS → mode **Full (strict)** (bukan Flexible → redirect loop).
2. Supaya log & rate limit anonim melihat IP asli, tambahkan di dalam blok `server { listen 443 ... }`:
   ```nginx
   # Daftar terbaru: https://www.cloudflare.com/ips/
   set_real_ip_from 173.245.48.0/20;   set_real_ip_from 103.21.244.0/22;
   set_real_ip_from 103.22.200.0/22;   set_real_ip_from 103.31.4.0/22;
   set_real_ip_from 141.101.64.0/18;   set_real_ip_from 108.162.192.0/18;
   set_real_ip_from 190.93.240.0/20;   set_real_ip_from 188.114.96.0/20;
   set_real_ip_from 197.234.240.0/22;  set_real_ip_from 198.41.128.0/17;
   set_real_ip_from 162.158.0.0/15;    set_real_ip_from 104.16.0.0/13;
   set_real_ip_from 104.24.0.0/14;     set_real_ip_from 172.64.0.0/13;
   set_real_ip_from 131.0.72.0/22;
   real_ip_header CF-Connecting-IP;
   ```
3. Renewal certbot tetap jalan lewat HTTP-01 selama "Always Use HTTPS" Cloudflare tidak memblokir `/.well-known/acme-challenge/`.

## D. VERIFIKASI

```bash
curl -sI http://DOMAIN.COM/ | head -3                 # 301 → https://
curl -s  https://DOMAIN.COM/api/status                # {"success":true,"status":"ok"}
curl -sI https://DOMAIN.COM/ | grep -iE 'strict-transport|permissions-policy|content-security'
curl -s  https://DOMAIN.COM/robots.txt | grep Sitemap # harus DOMAIN.COM, bukan hmsdp.vercel.app
```

Status 502 → app tidak jalan (`pm2 status`, `pm2 logs`). Status 503 di `/api/status` → app jalan tapi DB tidak terjangkau (cek `DATABASE_URL`).

---

### ✅ **SELESAI — HTTPS BISA DIAKSES. LANJUT KE [09_CRONJOBS_SETUP.md](09_CRONJOBS_SETUP.md) untuk backup.**
