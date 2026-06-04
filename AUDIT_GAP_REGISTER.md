# Audit Gap Register

Tanggal: 2026-06-04

## Fixed (terverifikasi di codebase)

- Attendance proof v2: payload bertanda versi, `action` checkin/checkout, nonce single-use, signature HMAC timing-safe compare. [attendanceValidation.ts](file:///c:/Users/shink/Pictures/absenyura/server/utils/attendanceValidation.ts) + [attendance.controller.ts](file:///c:/Users/shink/Pictures/absenyura/server/controllers/attendance.controller.ts)
- Production guardrails: app menolak start di Production/Vercel jika `ATTENDANCE_PROOF_SECRET` < 32 chars; `trust proxy` aktif untuk IP validation. [app.ts](file:///c:/Users/shink/Pictures/absenyura/server/app.ts)
- Cron auth: `/api/cron/*` dilindungi `CRON_SECRET` via `Authorization: Bearer` atau `X-Cron-Secret`, timing-safe compare, response 404 untuk hardening. [guardInternal.ts](file:///c:/Users/shink/Pictures/absenyura/server/middlewares/guardInternal.ts)
- Checkout hardening: check-out butuh challenge `action=checkout`, attendance_id wajib, dan validasi metadata foto (size + mime). [attendance.controller.ts](file:///c:/Users/shink/Pictures/absenyura/server/controllers/attendance.controller.ts)
- Refresh token rotation: `refresh_token_hash` di DB diverifikasi dan di-rotate tiap refresh; logout menghapus hash. [authService.ts](file:///c:/Users/shink/Pictures/absenyura/server/services/authService.ts)
- Upload image validation: sniff MIME dari buffer (file-type), extension allowlist, strip metadata via sharp, size limit, reject non-image. [upload.ts](file:///c:/Users/shink/Pictures/absenyura/server/utils/upload.ts)

## Open (butuh tindak lanjut)

- Cleanup nonce TTL: `ChallengeNonce` tidak punya job cleanup; saat ini hanya dibersihkan saat dipakai. Risiko: tabel menumpuk jika banyak request challenge yang tidak dipakai. Owner: Backend.
- Gallery/EXIF detection lemah: hanya substring `"Exif"` pada header 1024 bytes; bisa false positive/false negative. Owner: Backend.
- Validasi GPS tetap client-supplied (design limit): proof v2 mencegah replay/mismatch, tapi tidak bisa memverifikasi “GPS asli” tanpa hardware attestation. Owner: Product/Backend (accepted design).
- Local uploads di Vercel: jika `CLOUDINARY_URL` tidak diset di production, app sudah fail-fast; untuk non-Vercel VPS tanpa Cloudinary, pastikan `/uploads` dipersist dan diproxy. Owner: Ops.

## Accepted Risk (didokumentasikan)

- Admin endpoint mengembalikan `wifi_bssid` (dipakai untuk konfigurasi allowlist kampus). Ini memang sensitif dan harus dibatasi role admin. Owner: Product.

## Verifikasi cepat (manual)

- `/api/attendance/challenge`:
  - tanpa `ATTENDANCE_PROOF_SECRET` (prod/vercel) → app tidak boot
  - `action=checkout` tanpa `attendance_id` → 400
- `/api/cron/trigger?job=session`:
  - header secret salah/hilang → 404
  - header benar → 200
