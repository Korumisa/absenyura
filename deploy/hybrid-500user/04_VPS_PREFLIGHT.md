# ✈️ 04 — STEP 0: SSH VPS + PREFLIGHT CHECK HARDWARE

Estimasi: 5 menit.

---

## A. SSH MASUK KE VPS

Anda butuh **Terminal / PowerShell / Git Bash / Termius / PuTTY**:

```bash
# Windows PowerShell / macOS Terminal / Linux
ssh root@103.xxx.xxx.xxx
# Isi password root yang Anda buat saat order.
```

Saat pertama kali SSH muncul prompt:

```
The authenticity of host '103.xxx.xxx.xxx (103.xxx.xxx.xxx)' can't be established.
ED25519 key fingerprint is SHA256:XXXX.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

→ **ketik `yes` + Enter.**

Jika berhasil masuk, prompt berubah menjadi:

```
root@hmsdp-sg-prod-01:~#
```

---

## B. JALANKAN PREFLIGHT CHECK 6 DIMENSI

Ini **PAKSA JALANKAN PERTAMA KALI**. Jika FAIL → perbaiki dulu sebelum lanjut install software.
Preflight script ada di repo project Anda: `scripts/vps-preflight.sh`.

Cara termudah = fetch RAW dari GitHub / git clone repo dulu, atau copy paste langsung dari file lokal.

**Opsi 1 — Repo sudah ada di GitHub (recommended)**:

```bash
# 1. Download preflight script dari repo Anda (ganti URL RAW GitHub Anda!)
apt update -y && apt install -y curl jq bash coreutils
curl -sSL https://raw.githubusercontent.com/<USERNAME>/<REPO>/refs/heads/main/scripts/vps-preflight.sh -o /root/preflight.sh

# 2. Beri izin execute
chmod +x /root/preflight.sh

# 3. Jalankan!
./preflight.sh
```

**Opsi 2 — Copy paste file dari lokal (jika repo belum di-push ke GitHub)**:

- Buka di laptop: [scripts/vps-preflight.sh](file:///c:/Users/shink/Pictures/absenyura/scripts/vps-preflight.sh)
- Copy SEMUA isi → Paste ke terminal VPS dengan perintah:
  ```bash
  nano /root/preflight.sh
  # (paste semua isi dengan klik kanan, Ctrl+O simpan, Enter, Ctrl+X keluar)
  chmod +x /root/preflight.sh && ./preflight.sh
  ```

---

## C. BACA HASIL PREFLIGHT

Output ideal (hanya contoh):

```
═══════════════════════════════════════════════════════════════
  HMSDP VPS PREFLIGHT CHECK — Hostinger KVM 2 SG
═══════════════════════════════════════════════════════════════
 PASS  1/6 OS   : Ubuntu 22.04 LTS x86_64 (5.15.0-76)
 PASS  2/6 RAM  : 8 GB + Swapfile 3 GB (rekomendasi ≥ 6 GB)
 PASS  3/6 CPU  : 2 vCPU Intel Xeon Platinum 8375C AVX2 ok
 PASS  4/6 DISK : NVMe 91 GB / 100 GB (9% used, free 82 GB) ok
 PASS  5/6 KERNEL+APT: apt cache reachable, security repo ok
 PASS  6/6 NETWORK+PKG: apt repo ping 120 ms, curl pkg available
═══════════════════════════════════════════════════════════════
 PREFLIGHT RESULT: ✅ 6/6 PASS. LANJUT KE STEP 1.
═══════════════════════════════════════════════════════════════
```

**⚠️ JIKA ADA BARIS MERAH "FAIL" (exit code 1):**

- **FAIL RAM < 6 GB** → Anda salah order paket KVM 1 (4 GB). Cancel order / upgrade ke KVM 2. Jangan lanjut! OOM bakal sering.
- **FAIL DISK < 40 GB free** → VPS template ada sampah. Jalankan command yang di-print untuk bersihkan apt cache.
- **FAIL OS BUKAN Ubuntu 22.04** → Reinstall OS VPS lewat Hostinger hPanel → Settings → Reinstall OS → Pilih Ubuntu 22.04.
- **FAIL NET apt unreachable** → Tunggu 10 menit coba lagi, mungkin apt repo Hostinger maintenance.

Semua **PASS → lanjut ke 05_INSTALL_STACK.sh.**
