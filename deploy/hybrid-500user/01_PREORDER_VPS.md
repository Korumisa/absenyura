# 🛒 01 — ORDER VPS HOSTINGER KVM 2 SINGAPURA

Estimasi: 10 menit + 2-10 menit provisioning VPS.

---

## 1. Login Hostinger → Menu VPS → KVM

Link: https://hpanel.hostinger.com/vps/add-new

## 2. PILIH PAKET KVM 2 (Rp 155.900 / bulan)

| PAKET         | KVM 1                  | ✅ **KVM 2**       | KVM 4      | KVM 8      |
| ------------- | ---------------------- | ------------------ | ---------- | ---------- |
| Harga 1 bulan | Rp 98.900              | **Rp 155.900**     | Rp 234.900 | Rp 417.900 |
| RAM           | 4 GB                   | **✅ 8 GB**        | 16 GB      | 32 GB      |
| vCPU          | 1 vCPU                 | **✅ 2 vCPU**      | 4 vCPU     | 8 vCPU     |
| SSD           | 50 GB                  | **✅ 100 GB NVMe** | 200 GB     | 400 GB     |
| Bandwidth     | 4 TB                   | **✅ 8 TB**        | 16 TB      | 32 TB      |
| 500 user fit? | ⚠️ Pas (OOM 4 GB risk) | **✅ PAS 100%**    | Over       | Over       |

## 3. PILIH REGION — ⚠️ **SINGAPURA (SG)** — JANGAN SALAH!

Ini PALING PENTING untuk latensi scan QR dari Indonesia:

- ❌ USA East → 250 ms → Loading 3-5 detik scan QR
- ❌ Jerman → 350 ms → Timeout sering
- ✅ **SINGAPORE (SG / ap-southeast)** → 30-70 ms → Scan QR < 500 ms UX lancar

## 4. PILIH SISTEM OPERASI — ⚠️ **Ubuntu 22.04 LTS x86_64 (Jammy)**

- ❌ Ubuntu 24.04 LTS (BELUM stabil PPA PostgreSQL / PgBouncer ada broken dependency)
- ❌ Debian 12 (cara install Node PPA berbeda, guide TIDAK berlaku)
- ❌ CentOS 9 (base package berbeda)
- ❌ Almalinux / Rocky Linux
- ✅ **Ubuntu 22.04 LTS Jammy Jellyfish x86_64 (DEFAULT)**

## 5. HOSTNAME

Isi bebas, misal:

```
hmsdp-sg-prod-01
```

## 6. PASSWORD ROOT

Buat password root KUAT 24 karakter campuran (simpan di Bitwarden / notepad):

```
Contoh (GUNAKAN MILIK SENDIRI!):  Hm$DP2o26!SG@ProX9#kVmQz
```

## 7. CHECKOUT

Pilih durasi 3 bulan / 6 bulan / 12 bulan (LEBIH PANJANG LEBIH MURAH).

- 12 bulan → Diskon besar → Rp ~125.000 / bulan.

## 8. TUNGGU EMAIL WELCOME

Proses provisioning VPS = 2-10 menit.
Anda akan terima email:

```
Subject: Your VPS is now active!
IP VPS      : 103.xxx.xxx.xxx      ← CATAT INI!
Username    : root
Password    : <yang Anda buat step 6>
```

---

### ✅ **SELESAI → LANJUT KE FILE [02_SUPABASE_OPTIMIZE.sql](02_SUPABASE_OPTIMIZE.sql)**

(Sambil tunggu provisioning VPS, kita optimasi Supabase dulu GRATIS.)
