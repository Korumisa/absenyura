# ✅ SMOKE TEST PRELAUNCH 20 TIKET

Estimasi: 30 menit. Kerjakan SEMUA. Minimal 19/20 PASS = GO-LIVE.
`DOMAIN` di bawah = domain produksi (mis. `hmsdp.me`). Dipanggil dari [README.md](README.md) langkah 9.

**Cara mencatat:**

- [✅] = PASS
- [⚠️] = CONDITIONAL (minor, tidak blocking user)
- [❌] = FAIL (blocking, perbaiki sebelum launch)
- SIGN-OFF: `Nama: ___ / TTD: ___ / TGL: 2026-__-__`

---

## 🖥️ TIKET INFRA VPS (1-5)

| #   | Test                                   | Cara Cek                                                     | Expected Result                                                   | Status |
| --- | -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- | ------ |
| 1   | Preflight 6/6 PASS                     | `bash /var/www/hmsdp/repo/deploy/scripts/preflight.sh`       | Tidak ada tulisan FAIL di output                                  | [ ]    |
| 2   | Firewall UFW port hanya 22/80/443      | `sudo ufw status numbered`                                   | Port 3001/5432/6432 tidak ada di daftar ALLOW                     | [ ]    |
| 3   | Swap 3 GB aktif                        | `free -h \| grep Swap`                                       | Swap > 2.8G terlihat                                              | [ ]    |
| 4   | PM2 auto startup reboot                | `sudo systemctl reboot` → tunggu 60 detik → SSH `pm2 status` | Status online, uptime dari baru                                   | [ ]    |
| 5   | Jam server sinkron NTP + app pakai UTC | `timedatectl \| grep synchronized` + `pm2 env 0 \| grep TZ`  | `System clock synchronized: yes` + `TZ: UTC` (sama dengan Vercel) | [ ]    |

## 🔐 TIKET SECURITY (6-9)

| #   | Test                                     | Cara Cek                                                                      | Expected Result                                       | Status |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| 6   | HTTP redirect ke HTTPS                   | `curl -I http://DOMAIN/`                                                      | Status 301 Location: https://                         | [ ]    |
| 7   | Header keamanan                          | `curl -sI https://DOMAIN/ \| grep -iE 'strict-transport\|permissions-policy'` | Ada HSTS + `camera=(self)` (kamera QR tidak diblokir) | [ ]    |
| 8   | File .env tidak bisa diakses via browser | Buka `https://DOMAIN/.env`                                                    | Status 404 halaman app (bukan download file!)         | [ ]    |
| 9   | Rate limit aktif                         | `curl -sI https://DOMAIN/api/status \| grep -i ratelimit`                     | Response header ada `RateLimit-*`                     | [ ]    |

## 🚀 TIKET RUNTIME APP (10-14)

| #   | Test                            | Cara Cek                                                | Expected Result                                                   | Status |
| --- | ------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- | ------ |
| 10  | Readiness endpoint OK           | `curl -s https://DOMAIN/api/status`                     | JSON `{"success":true,"status":"ok"}` (503 = DB tidak terjangkau) | [ ]    |
| 11  | Login Admin works               | Login email admin + password                            | Berhasil masuk, redirect ke dashboard                             | [ ]    |
| 12  | JWT refresh token works         | Login → close browser → buka lagi URL dashboard         | Tetap login (tidak ke redirect login lagi)                        | [ ]    |
| 13  | Import Mahasiswa Excel works    | Upload 10 baris sample → submit                         | 10 user baru di tabel Mahasiswa                                   | [ ]    |
| 14  | Dosen Dashboard loads < 2 detik | Login dosen → Dashboard → Chrome DevTools Network → XHR | /api/dashboard/dosen status 200, waktu < 2000 ms                  | [ ]    |

## 📸 TIKET FITUR UTAMA MAHASISWA (15-18)

| #   | Test                          | Cara Cek                                                        | Expected Result                                        | Status |
| --- | ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ | ------ |
| 15  | QR Code Scan page loads       | Login mahasiswa → Scan QR                                       | Kamera aktif, frame QR terlihat                        | [ ]    |
| 16  | Submit bukti absen foto works | Scan QR valid → Upload foto 3 MB → submit                       | Status "Tercatat Hadir", data masuk tabel Attendance   | [ ]    |
| 17  | Pengajuan Excuse Izin works   | Mahasiswa → Request Excuse → Pilih Session, upload surat dokter | Status PENDING di tabel ExcuseRequest                  | [ ]    |
| 18  | Dosen Approve Excuse works    | Dosen lihat permohonan → Approve                                | Status berubah APPROVED, Attendance ikut tercatat izin | [ ]    |

## 🚨 TIKET CRON & BACKUP (19-20)

| #   | Test                                             | Cara Cek                                                                           | Expected Result                                                              | Status |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| 19  | Cron in-process jalan                            | Tunggu 5 menit → `pm2 logs hmsdp-absenyura --lines 300 --nostream \| grep -i cron` | Ada `[Cron] Starting session status updater`, tidak ada `Uncaught Error`     | [ ]    |
| 20  | Backup script jalan 1x (user deploy, bukan sudo) | `bash /var/www/hmsdp/repo/deploy/scripts/backup.sh`                                | Exit 0, log berisi `Upload BERHASIL` + `Validasi SHA256 OK` → file ada di B2 | [ ]    |

---

## 🏁 FINAL: HITUNG RATIO PASS

```
Jumlah PASS [✅] = ____ / 20

Persentase  = (PASS / 20) × 100% = _____%
Ratio min   = ≥ 95% (≥ 19/20)
```

### Keputusan Final:

- ✅ **GO-LIVE** ≥ 19/20 PASS. Umumkan ke user via grup WhatsApp HMJ.
- ⚠️ **CONDITIONAL** 17-18/20. Perbaiki conditional dulu, 1 hari kemudian launch.
- ❌ **HOLD** ≤ 16/20. Perbaiki semua FAIL, ulangi 20 tes.

```
Sign-Off Auditor Teknis     : ____________________ / TTD: _________ TGL: 2026-__-__
Sign-Off Ketua Panitia HMJ  : ____________________ / TTD: _________ TGL: 2026-__-__
Sign-Off Dekan / Kabag Adm  : ____________________ / TTD: _________ TGL: 2026-__-__
```

---

### ✅ **SELESAI 20 TIKET — LANJUT KE [OPERATIONS.md](OPERATIONS.md) — 5 perintah HARIAN 2 menit diagnosa.**
