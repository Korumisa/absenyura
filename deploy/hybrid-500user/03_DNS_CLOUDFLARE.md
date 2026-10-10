# 🌐 03 — SETUP DNS CLOUDFLARE + CLOUDINARY + BACKBLAZE B2

Estimasi: 10 menit.

---

## A. SETUP DNS A RECORD (Point Domain ke IP VPS)

Gunakan Cloudflare / DNS manager domain Anda.

Contoh domain: `hmsdp-informatika-uniku.ac.id`

> ⚠️ `hmsdp.vercel.app` milik Vercel — **tidak bisa** diarahkan ke VPS. Wajib punya domain/subdomain sendiri
> (beli domain, atau minta subdomain kampus). App melayani frontend + API di **satu domain**.

Tambahkan DNS record BARU:

| Type         | Name                               | Content                              | Proxy status                                                                            | TTL                                     |
| ------------ | ---------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------- |
| ✅ **A**     | `@` (atau subdomain, mis. `absen`) | `103.xxx.xxx.xxx` (IP VPS Hostinger) | **DNS only ☁️ abu-abu** (wajib saat certbot; Proxied opsional nanti, lihat 08 bagian C) | **60** (setelah 1 minggu stabil → Auto) |
| ✅ **CNAME** | `www`                              | domain di atas                       | DNS only ☁️                                                                             | Auto                                    |

**Tunggu 1-5 menit propagasi.** Cek:

```bash
# Di PC / CMD lokal
nslookup hmsdp-informatika-uniku.ac.id
# Harus me-return IP VPS Anda 103.xxx.xxx.xxx
```

---

## B. ✅ CLOUDINARY — WAJIB! (Agar Storage Supabase Free Tidak Cepat Penuh)

Foto scan QR bukti absen TIDAK BOLEH di-save sebagai BLOB / base64 ke DB Supabase.
**Gunakan Cloudinary Free Tier** (25 GB storage, 25 GB bandwidth — cukup 500 user 2 tahun).

1. Daftar https://cloudinary.com/users/register_free
2. Dashboard → Klik icon ⚙️ Settings → Security → **Access Keys**
3. Klik **Generate new access key**
4. Copy **API Environment variable** yang formatnya:
   ```
   cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>
   ```
5. **Simpan ini di Notepad** → akan di-paste ke `.env` baris `CLOUDINARY_URL` nanti.

---

## C. ✅ BACKBLAZE B2 — BACKUP UTAMA (OTOMATIS 6 JAM SEKALI)

Supabase **Free tidak punya backup otomatis** — backup ini satu-satunya salinan data di luar Supabase.
Backblaze B2 Free Tier = 10 GB storage GRATIS (backup DB 500 user compressed = 50 MB, cukup 200+ copy).

1. Daftar https://www.backblaze.com/b2/sign-up.html → pilih region yang tersedia (region tidak bisa diubah setelah daftar)
2. Bucket → **Create a Bucket**:
   - Bucket name: `hmsdp-backup-free-uniku` (nama harus unik global)
   - Bucket Type: ✅ **Private** (default)
   - Object Lock = OFF
3. Menu **Application Keys** → **Add a New Application Key**:
   - Name of Key: `hmsdp-vps-backup`
   - Allow access to Bucket(s): Pilih `hmsdp-backup-free-uniku`
   - Capabilities: ✅ Read and Write
   - File name prefix: (kosong)
   - Expiration: NEVER
   - → Create New Key
4. Simpan 3 nilai ini:
   ```
   B2_APPLICATION_KEY_ID    = 005xxxxxxxxxxxxxxxxx (copy dari kolom "keyID")
   B2_APPLICATION_KEY       = K005xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   B2_BUCKET_NAME           = hmsdp-backup-free-uniku
   B2_ENDPOINT              = s3.<region>.backblazeb2.com
   # Contoh endpoint: s3.ap-southeast-002.backblazeb2.com
   ```
5. **Simpan di Notepad.** Setelah VPS siap (step 05), daftarkan ke rclone sebagai user `deploy`
   (key disimpan di `~/.config/rclone/rclone.conf`, BUKAN di `.env`):
   ```bash
   rclone config create b2remote b2 account=<B2_APPLICATION_KEY_ID> key=<B2_APPLICATION_KEY>
   rclone lsd b2remote:                      # harus tampil bucket hmsdp-backup-free-uniku
   ```
   Lalu di `.env`: `BACKUP_RCLONE_REMOTE=b2remote` dan `BACKUP_RCLONE_PATH=hmsdp-backup-free-uniku/hmsdp-db-backups`.

---

### ✅ **SELESAI → JIKA VPS SUDAH READY (email welcome diterima) LANJUT KE [04_VPS_PREFLIGHT.md](04_VPS_PREFLIGHT.md)**
