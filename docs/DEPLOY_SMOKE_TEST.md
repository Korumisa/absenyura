# Smoke test & rollback (audit follow-up)

Jalankan sebelum merge/deploy ke produksi.

## Build

```bash
npx tsc --noEmit
npm run build
```

## Smoke test kritis (~15 menit)

- [ ] Login mahasiswa + admin
- [ ] Dashboard mahasiswa: banner sesi / tombol absen (jika ada sesi aktif)
- [ ] `/attend`: QR → GPS → foto → check-in sukses
- [ ] Admin: buat/edit sesi (wizard), simpan
- [ ] Admin: export Excel/PDF di Reports (+ toast sukses)
- [ ] Beranda publik + satu halaman berita
- [ ] Peta di `/attend` dan `/locations` (setelah scoped Leaflet CSS)

## Opsional

```bash
curl -I https://hmsdp.vercel.app/robots.txt
curl -I https://hmsdp.vercel.app/api/public-site/profile
```

## Lighthouse (mobile, throttled)

Uji di **jendela penyamaran / Incognito** agar IndexedDB/PWA tidak memengaruhi skor.

- Beranda `/`
- `/attend` (setelah login)
- `/dashboard` (admin)

Target: LCP &lt; 2.5s, FCP &lt; 1.8s.

Catatan perbaikan performa:
- **Beranda `/`**: logo `logo-hmsdp.webp` (~KB, bukan PNG 636KB), Cloudinary `f_auto,q_auto,w_*`, hero LCP `priority` + preload (PublicLayout), hero tanpa animasi opacity-0, navbar/overlay tanpa framer-motion, API bawah-fold ditunda (`requestIdleCallback`), PWA `registerSW` defer, Analytics/Speed Insights idle
- **Dashboard**: font Plus Jakarta non-blocking; Cormorant ditunda; Recharts lazy-load
- Uji ulang beranda di Incognito — target Performance &gt; 70 setelah deploy

## Vercel Analytics

- `@vercel/analytics` + Speed Insights sudah di `src/main.tsx`
- Pastikan Speed Insights aktif di dashboard Vercel project
- Event `checkin_success` dikirim setelah check-in sukses

## Rollback

1. Vercel → Deployments → redeploy deployment sebelumnya (tanpa migrasi DB).
2. Cache API publik: revert `server/middlewares/publicSiteCache.middleware.ts` + baris di `server/routes/public-site.ts`.
