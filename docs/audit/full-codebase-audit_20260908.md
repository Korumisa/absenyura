# FULL CODEBASE AUDIT — 08 September 2026

**Cakupan:** Code Efficiency, User Flow, UI/UX Flaws  
**Metodologi:** Analisis statis lintas file (130+ file di `src/`, `server/`, dan konfigurasi)  
**Klasifikasi Severity:** `critical` — crash / data loss / security; `moderate` — UX rusak / perf buruk / maintenance cost tinggi; `minor` — inkonsistensi visual / polish / DX

---

## 📌 SYSTEMIC PATTERNS (Pola Berulang di Banyak File)

### SYS-01 — `useCallback` & `useMemo` Absen Secara Massal di Handler Form/Page
**Severity:** moderate  
**Affected files:** >15 halaman — [Sessions.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Sessions.tsx), [Attend.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Attend.tsx), [Classes.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Classes.tsx), [Fungsionaris.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Fungsionaris.tsx), [Berita.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Berita.tsx), [OpenRecruitment.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/OpenRecruitment.tsx), [useMutationToast.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useMutationToast.ts), [History.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/History.tsx), [InformasiLomba.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/InformasiLomba.tsx), [Kegiatan.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Kegiatan.tsx), [Galeri.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Galeri.tsx), [Reports.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Reports.tsx)

**Masalah:** Function handler (onSubmit, handleOpen, setQuery, dll) dan pure utility function (`formatForDateTimeLocal`, `contactHref`, `safeRelation`) dibuat dengan referensi BARU setiap render. Jika dilempar ke child component atau masuk ke `useEffect` deps, memicu re-render berantai dan stale closure risk. [useMutationToast.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useMutationToast.ts) yang dipakai >10 halaman mengembalikan function tanpa `useCallback`. Array literal inline di JSX (History baris 63, InformasiLomba baris 92) dibuat ulang tiap render.

**Fix yang disarankan:**
- Buat ESLint rule `react-hooks/exhaustive-deps` + `@typescript-eslint/no-magic-numbers` untuk array inline.
- Extract konstanta array filter (STATUS_OPTIONS, FILTER_OPTIONS) ke luar komponen.
- Bungkus return functions `useMutationToast` dengan `useCallback([call, successMsg, errorMsg, onSuccess, onError])`.

---

### SYS-02 — Inline Empty/Error State TANPA Reuse Komponen Standar
**Severity:** moderate  
**Affected files:** [PublicHome.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/PublicHome.tsx) (6 lokasi), [Galeri.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Galeri.tsx) (2 lokasi), [OpenRecruitment.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/OpenRecruitment.tsx) (2 lokasi), [PublicSectionBody.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/public/PublicSectionBody.tsx#L41-L48)

**Masalah:** Tersedia 2 komponen standar ([AdminEmptyState](file:///C:/Users/shink/Pictures/absenyura/src/components/admin/AdminEmptyState.tsx), [PublicEmptyState](file:///C:/Users/shink/Pictures/absenyura/src/components/public/PublicEmptyState.tsx)) tapi 10+ inline copy-paste JSX dibuat manual. Akibat: styling tidak konsisten (`border-dashed` variant berbeda), `role="status"` hilang di 90% kasus, perubahan design system harus diedit di 10 lokasi.

**Fix yang disarankan:**
- `PublicSectionBody.tsx` render `<PublicEmptyState>` dari dalam, bukan copy JSX.
- 6 empty state di PublicHome → replace dengan `<PublicEmptyState variant="global" />` / `<ErrorWithRetry />`.

---

### SYS-03 — Hardcoded Palette Warna (Bypass Tailwind Tokens)
**Severity:** moderate  
**Affected files:** >25 file — [PublicLayout.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/PublicLayout.tsx#L70), [PublicFooter.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/PublicFooter.tsx), [PublicNavbar.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/PublicNavbar.tsx), [Dashboard.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Dashboard.tsx), [ConfirmModal.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ConfirmModal.tsx#L31-L35), [skeleton.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/skeleton.tsx#L8), [badge.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/badge.tsx#L18-L24), [LastSavedIndicator.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/admin/LastSavedIndicator.tsx), [ErrorWithRetry.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ErrorWithRetry.tsx#L26-L29), [UserDropdown.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/UserDropdown.tsx), [NotificationMenu.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/NotificationMenu.tsx), [Attend.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Attend.tsx#L1286), [Users.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Users.tsx), [Reports.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Reports.tsx#L639)

**Masalah:** Tersedia theme tokens (`background, foreground, muted, destructive, accent, card, border` di tailwind config), tapi 50+ lokasi memakai `slate-*`, `emerald-*`, `indigo-*`, `sky-*`, `amber-*`, `rose-*`, `purple-*` hardcoded. Base [skeleton.tsx:8](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/skeleton.tsx#L8) malah `bg-slate-200/90` padahal dark mode `bg-muted` (inkonsisten per-mode). Button di [ConfirmModal.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ConfirmModal.tsx#L31-L35) dan [Attend.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Attend.tsx#L1286) BYPASS variant system dengan className override (`bg-emerald-600 hover:bg-emerald-700`).

**Fix yang disarankan:**
- Buat semantic tokens di `tailwind.config.js`: `--success`, `--warning`, `--info` sebagai HSL CSS vars.
- Tambah `variant="success"` & `variant="warning"` ke [button.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/button.tsx).
- [skeleton.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/skeleton.tsx#L8): ganti `bg-slate-200/90` → `bg-muted` (memperbaiki 6 implementasi skeleton sekaligus).
- Refactor PublicLayout / PublicFooter / PublicNavbar: `slate-900` → `foreground`, `slate-700` → `muted-foreground`, `slate-50` → `muted/40`, `border-black/10` → `border-border`.

---

### SYS-04 — N+1 Query SWR Endpoint Publik (Difetch Ulang Antar Halaman)
**Severity:** moderate  
**Affected files:** [usePublicHomeData.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/usePublicHomeData.ts), [Fungsionaris.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Fungsionaris.tsx), [Galeri.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Galeri.tsx), [BeritaDetail.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/BeritaDetail.tsx), [ProgramKerja.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/ProgramKerja.tsx), [Berita.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Berita.tsx), [InformasiLomba.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/InformasiLomba.tsx), [OpenRecruitment.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/OpenRecruitment.tsx)

**Masalah:** `/public-site/profile` di-fetch di 6 halaman berbeda. `/public-site/structure` di 2, `/public-site/programs` di 2, `/public-site/posts?type=BERITA` di 2, `/public-site/galleries` di 2, `/public-site/recruitments` di 2, `/public-site/posts?type=LOMBA` di 2. Setiap navigasi antar halaman memicu request BARU (SWR dedup hanya interval singkat).

**Fix yang disarankan:**
- Naikkan `dedupingInterval: 30000` (30s) di global SWR config untuk key `/public-site/*`.
- Atau bungkus PublicLayout dengan `PublicSiteDataContext` yang prefetch semua 7 endpoint sekali.

---

### SYS-05 — N+1 Prisma Query & Non-optimized Loop di Server Cron
**Severity:** critical (saat jumlah data besar)  
**Affected files:** [cron.ts](file:///C:/Users/shink/Pictures/absenyura/server/jobs/cron.ts), [user.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/user.controller.ts#L765-L778), [public-site.v2.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/public-site.v2.controller.ts#L93-L115), [report.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/report.controller.ts#L236-L237)

**Masalah:**
- [cron.ts:227-230](file:///C:/Users/shink/Pictures/absenyura/server/jobs/cron.ts#L227-L230): `attendance.findMany()` per-session dalam loop (100 sesi = 100 query).
- [cron.ts:284-292](file:///C:/Users/shink/Pictures/absenyura/server/jobs/cron.ts#L284-L292): COUNT per-class nested loop (30 query).
- [cron.ts:145-154](file:///C:/Users/shink/Pictures/absenyura/server/jobs/cron.ts#L145-L154) & [254-262](file:///C:/Users/shink/Pictures/absenyura/server/jobs/cron.ts#L254-L262): `notification.create()` satu per satu — harusnya `createMany()`.
- [cron.ts:403-445](file:///C:/Users/shink/Pictures/absenyura/server/jobs/cron.ts#L403-L445): Sequential photo cleanup + **blocking `fs.unlinkSync()`**.
- [report.controller.ts:236-237](file:///C:/Users/shink/Pictures/absenyura/server/controllers/report.controller.ts#L236-L237): `Array.includes()` dalam `.filter()` = O(n*m). Harusnya Set.
- [public-site.v2.controller.ts:93-115](file:///C:/Users/shink/Pictures/absenyura/server/controllers/public-site.v2.controller.ts#L93-L115): `while(true)` query `findUnique` untuk slug uniqueness.

**Fix yang disarankan:**
- Batch query dengan `where: { id: { in: ids } }` lalu group dengan `Map`.
- `notification.createMany()` batch.
- `fs.promises.unlink()` + `p-limit` concurrency untuk cleanup.
- `Set(presentUserIds)` ganti `Array.includes()`.

---

### SYS-06 — Duplikasi Logika Validasi Enrollment & Constraint Absensi
**Severity:** moderate  
**Affected files:** [attendance.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/attendance.controller.ts#L353-L506), [excuse.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/excuse.controller.ts#L46-L366), [session.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/session.controller.ts#L561-L582), [report.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/report.controller.ts#L7-L17), [user.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/user.controller.ts#L72-L87), [audit.controller.ts](file:///C:/Users/shink/Pictures/absenyura/server/controllers/audit.controller.ts#L6-L9)

**Masalah:** Logika ekstraksi `classIds` dari `session` + `classEnrollment.findFirst()` pengecekan enrollment muncul 4x (attendance check-in, excuse challenge, createExcuse, getSessionById USER). Device fingerprint validation 2x (checkIn/checkOut). QR mode validation 2x. Geofence+IP restriction 2x. Pagination parsing 3 implementasi berbeda.

**Fix yang disarankan:**
- Extract `assertStudentEnrolledInSession(userId, sessionId)` di `server/utils/sessionAccess.ts`.
- Extract `validateLocationConstraints(req, session, gps)` helper.
- Satu `parsePagination({ page, limit, maxLimit })` util bersama.

---

### SYS-07 — 3 Mekanisme Toast dengan Duration Inkonsisten
**Severity:** moderate  
**Affected files:** [toastMessage.ts](file:///C:/Users/shink/Pictures/absenyura/src/lib/utils/toastMessage.ts), [useMutationToast.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useMutationToast.ts), [App.tsx](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L255), [useAutoLogout.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useAutoLogout.ts#L37), [Attend.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Attend.tsx#L371)

**Masalah:**

| Layer | Success | Error |
|---|---|---|
| `toastSuccess()` wrapper | 3000ms | - |
| `toastError()` wrapper | - | 5000ms |
| `useMutationToast` | default (4000ms) | 6000ms |
| App.tsx Toaster default | 4000ms | 4000ms |
| Langsung `toast.success()` | 4000ms | bervariasi |

UX tidak predictable. Toast success terkadang hilang terlalu cepat (3s), error antara 4-6s. `Attend.tsx` pakai `toast.warning()` tanpa helper (tidak ada `toastWarning` wrapper).

**Fix:** Paksa 1 standar di `toastMessage.ts`: Success 3500ms, Error 5000ms, Warning 4000ms, Info 4000ms. Lalu paksa semua pemanggilan melalui helper ini (larang `toast.success()` langsung via ESLint).

---

### SYS-08 — Missing Database Indexes di Tabel Core
**Severity:** critical  
**Affected files:** [schema.prisma](file:///C:/Users/shink/Pictures/absenyura/prisma/schema.prisma)

**Masalah:**
- **Notification** ([schema.prisma:201-210](file:///C:/Users/shink/Pictures/absenyura/prisma/schema.prisma#L201-L210)): TANPA `@@index`. Query `where: { user_id, is_read: false }` + `orderBy created_at` berjalan penuh.
- **ExcuseRequest** ([170-187](file:///C:/Users/shink/Pictures/absenyura/prisma/schema.prisma#L170-L187)): Hanya `@@unique([user_id, session_id])`. Tidak ada index `session_id + status` untuk cron batch filter dan `user_id + created_at` untuk USER list.
- **AuditLog** ([189-199](file:///C:/Users/shink/Pictures/absenyura/prisma/schema.prisma#L189-L199)): Pagination `orderBy created_at desc` TANPA index.
- **Attendance** ([142-168](file:///C:/Users/shink/Pictures/absenyura/prisma/schema.prisma#L142-L168)): Tidak ada index `status` (EWS cron filter `status IN [...]`).
- **User** ([11-39](file:///C:/Users/shink/Pictures/absenyura/prisma/schema.prisma#L11-L39)): Tidak ada compound `(role, is_active)` untuk query `where: { role: 'USER', is_active: true }`.

**Fix:** Tambahkan migration dengan:
```prisma
@@index([user_id, created_at]) on Notification
@@index([user_id, is_read]) on Notification
@@index([session_id, status]) on ExcuseRequest
@@index([user_id, created_at]) on ExcuseRequest
@@index([created_at]) on AuditLog
@@index([actor_id, created_at]) on AuditLog
@@index([status]) on Attendance
@@index([role, is_active]) on User
@@index([created_by_id, created_at]) on Session
```

---

## ⚡ KATEGORI 1: CODE EFFICIENCY

### EFF-01 — `useFormDirtyGuard` Tidak Bekerja (useBlocker Butuh Data Router)
**Severity:** critical  
**File:** [useFormDirtyGuard.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useFormDirtyGuard.ts#L23-L32) + [App.tsx:337](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L337)

**Masalah:** [useFormDirtyGuard.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useFormDirtyGuard.ts#L23-L32) menggunakan `useBlocker()` react-router. Dokumentasi: `useBlocker` HANYA bekerja di Data Router context (`RouterProvider` + createBrowserRouter). App.tsx menggunakan `<BrowserRouter>` legacy. Ada `try/catch` yang **swallow error** — artinya fitur "konfirmasi sebelum pindah halaman jika form dirty" TIDAK PERNAH BEKERJA untuk navigasi SPA. Hanya `beforeunload` (hard refresh) yang berfungsi.

**Dampak:** User menekan back browser / klik link sidebar saat edit form di Sessions/Classes/Users/PublicSite CMS — perubahan hilang tanpa peringatan.

**Fix:** Ganti `<BrowserRouter>` → `createBrowserRouter` + `<RouterProvider>`. Atau fallback implementasi manual dengan `useBeforeUnload` + monkey-patch History API untuk SPA navigasi.

---

### EFF-02 — Konfigurasi manualChunks Buruk + Dead Dependency `pdfmake`
**Severity:** moderate  
**Files:** [vite.config.ts:74-87](file:///C:/Users/shink/Pictures/absenyura/vite.config.ts#L74-L87), [package.json](file:///C:/Users/shink/Pictures/absenyura/package.json)

**Masalah:**
- `pdfmake` (~280KB gzip) TIDAK DIGUNAKAN di codebase. Cukup di-`npm uninstall`.
- `html2canvas` ada di `manualChunks` vendor-export tapi TIDAK ADA di package.json → Rollup warning / mischunk.
- **Tidak ada chunk `vendor-icons: ['lucide-react']`** — padahal ~60-80KB, dipakai semua halaman → terduplikasi di tiap page chunk.
- **Tidak ada chunk `vendor-date: ['date-fns']`** — dipakai 14 file → locale `id` terduplikasi per-chunk.
- `vite-plugin-pwa` dan `@types/bcryptjs` salah kategori (harus devDependencies, bukan dependencies).
- `@react-leaflet/core` dependency eksplisit padahal dependency transitif `react-leaflet` (berpotensi double resolve).

**Fix:**
- Hapus `pdfmake`, `@react-leaflet/core`, `strtok3` eksplisit.
- Hapus `html2canvas` dari manualChunks.
- Tambah `'vendor-icons': ['lucide-react']`, `'vendor-date': ['date-fns']` ke manualChunks.
- Pindah 2 paket ke devDependencies.

---

### EFF-03 — `qrcode` & `NotificationMenu` Eager-load di Entry yang Tidak Perlu
**Severity:** moderate  
**Files:** [Reports.tsx:21](file:///C:/Users/shink/Pictures/absenyura/src/pages/Reports.tsx#L21), [Layout.tsx:27](file:///C:/Users/shink/Pictures/absenyura/src/components/Layout.tsx#L27) import NotificationMenu

**Masalah:**
- [Reports.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Reports.tsx#L21): `import QRCode from 'qrcode'` top-level. User hanya melihat tabel tanpa export — chunk Reports membawa ~40KB gzip qrcode sia-sia.
- [Layout.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/Layout.tsx#L27): NotificationMenu eager-loaded, mem-boyong `date-fns/formatDistanceToNow` + locale. User TIDAK PERNAH buka menu → bundle berisi utilitas yang tidak terpakai.
- `date-fns` locale `id` diimport di 14 file berbeda → potensi duplikasi kode locale tiap chunk.

**Fix:**
- Dynamic import `const QRCode = (await import('qrcode')).default` di dalam export handler.
- `const NotificationMenu = lazy(() => import('@/components/NotificationMenu'))` + Suspense di Layout.
- Satu re-export file `src/lib/utils/date.ts` berisi `import { id } from 'date-fns/locale'` — semua file import dari sana.

---

### EFF-04 — PWA Cache Limit 2MB Berpotensi Melewati Batas Chunk Export
**Severity:** minor  
**File:** [vite.config.ts:50](file:///C:/Users/shink/Pictures/absenyura/vite.config.ts#L50)

**Masalah:** `maximumFileSizeToCacheInBytes: 2_000_000`. Chunk vendor-export (exceljs ~300KB gzip + jspdf + autotable ≈ unggzip 3-4MB) berpotensi melewati batas 2MB. Jika dilewati, Workbox MENOLAK cache → user redownload chunk export setiap kali buka Reports.

**Fix:** Naikkan ke `5_000_000` (5MB). ATAU lakukan Excel/PDF export SERVER-SIDE di `report.controller.ts` (sudah ada exceljs di server) dan hapus `exceljs`/`jspdf` client sama sekali (saving ~500KB gzip client).

---

### EFF-05 — Missing `useEffect` Dependency Arrays (Stale Closure Risk)
**Severity:** moderate  
**Files:** [Classes.tsx:144-147](file:///C:/Users/shink/Pictures/absenyura/src/pages/Classes.tsx#L144-L147), [Sessions.tsx:227-231](file:///C:/Users/shink/Pictures/absenyura/src/pages/Sessions.tsx#L227-L231), [Forbidden.tsx:18-20](file:///C:/Users/shink/Pictures/absenyura/src/pages/Forbidden.tsx#L18-L20)

**Masalah:**
- Classes: `fetchSubjects` tidak ada di deps (dideklarasikan tanpa useCallback).
- Sessions: `fetchLocations` tidak ada di deps array.
- Forbidden: `toastError` tidak ada di deps (dijalankan 2x di Strict Mode).

**Fix:** Extract function ke luar komponen jika tidak depend state. Atau bungkus dengan `useCallback` dan masukkan ke deps. Aktifkan ESLint `react-hooks/exhaustive-deps` sebagai error.

---

### EFF-06 — Upload Photo "InBackground" Sebenarnya Blocking (await-ed)
**Severity:** moderate  
**File:** [attendance.controller.ts:551-560](file:///C:/Users/shink/Pictures/absenyura/server/controllers/attendance.controller.ts#L551-L560)

**Masalah:** Fungsi bernama `uploadPhotoInBackground` tapi **dijalankan dengan `await`** sebelum response HTTP line 560. Check-in user tertahan 250ms-2s menunggu Cloudinary/storage upload. Bukan async fire-and-forget.

**Fix:** Pindahkan upload ke background queue (BullMQ) atau jalankan tanpa await tapi tangkap error dengan `void uploadPhotoInBackground(...).catch(logError)`. Kirim response check-in segera, update photo URL belakangan via patch.

---

### EFF-07 — `queryWithSemesterFallback` Double-query Seluruh App (Sementara)
**Severity:** moderate  
**File:** [prismaErrors.ts](file:///C:/Users/shink/Pictures/absenyura/server/utils/prismaErrors.ts)

**Masalah:** Dipakai 15+ lokasi (semua excuse/session fetch, report, dashboard, class, enrollment). Setiap pemanggilan mengeksekusi DUA Prisma query identik (with/without semester select) ketika kolom belum ada. Mendouble DB load saat ini. TODO comment mengatakan akan dihapus post-migration — harus ditagih timeline.

**Fix:** Pastikan semua environment sudah menjalankan migration `20260614195000_class_semester`. Hapus seluruh fallback logic dan ganti dengan direct select.

---

### EFF-08 — Repeated Import Block 50-80% Identik di 8 Publik Pages
**Severity:** minor  
**Files:** Seluruh `src/pages/public/*.tsx` (Berita, Galeri, ProgramKerja, Fungsionaris, Kegiatan, OpenRecruitment, InformasiLomba, PublicHome)

**Masalah:** 15-22 baris import per file 80% isinya sama (PublicLayout, PublicEnter, PublicPageHero, useMockOrSwr, mockLandingData exports, publicSiteFetcher, safeArray, Lucide icons, Skeleton, EmptyState). Tree-shaking Vite sudah cukup baik, tapi maintenance buruk saat path refactor.

**Fix:** Buat barrel `src/pages/public/index.ts` re-export common items. Tiap halaman cukup: `import { useMockOrSwr, mockBerita, safeArray } from '@/pages/public'`.

---

## 🔀 KATEGORI 2: USER FLOW

### UF-01 — Redirect ProtectedRoute Tidak Konsisten + Session Expiry Silent
**Severity:** critical  
**Files:** [ProtectedRoute.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ProtectedRoute.tsx), [useSessionVerifier.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useSessionVerifier.ts#L73-L76), [Login.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Login.tsx#L55-L86), [UserDropdown.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/UserDropdown.tsx#L41-L49), [useAutoLogout.ts](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useAutoLogout.ts#L37-L39), [authStore.ts](file:///C:/Users/shink/Pictures/absenyura/src/stores/authStore.ts)

**Masalah berantai:**
1. **ProtectedRoute** ([45-50](file:///C:/Users/shink/Pictures/absenyura/src/components/ProtectedRoute.tsx#L45-L50)): `saveTarget()` + `location.state.from` DUAL mechanism (duplikasi sumber target). Format `state.from` TIDAK SERAGAM: terkadang string `pathname`, terkadang object `{ pathname, search, hash }`.
2. **useSessionVerifier 401/403** ([73-76](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useSessionVerifier.ts#L73-L76)): Hanya `saveTarget()` + `logout()` — **TIDAK ADA NAVIGATE**. User diam-diam dibiarkan di halaman skeleton/error.
3. **useAutoLogout** ([37-39](file:///C:/Users/shink/Pictures/absenyura/src/hooks/useAutoLogout.ts#L37-L39)): `window.location.href = '/login'` (hard redirect) TIDAK konsisten dengan UserDropdown yang pakai `navigate('/login')` tanpa `replace:true`.
4. **Login.tsx** ([65+74](file:///C:/Users/shink/Pictures/absenyura/src/pages/Login.tsx#L65-L74)): `setAuth()` langsung set `sessionStatus='verified'` (melewati verifikasi). `navigate()` sinkron tapi zustand persist async → **race condition flash double redirect** (ProtectedRoute target baca hasHydrated false → redirect balik login → restore → redirect lagi).
5. **authStore.ts partialize** ([63](file:///C:/Users/shink/Pictures/absenyura/src/stores/authStore.ts#L63)): Tidak persist `sessionStatus` → selalu `guest` → `unknown` saat rehydrate → **flash skeleton setiap page refresh**.

**Fix:**
- Satu logout util: selalu `navigate('/login', { replace: true })` + toast.info("Sesi berakhir, silakan login kembali").
- useSessionVerifier WAJIB navigate + toast pada 401.
- post-login: TUNGGU zustand persist selesai via `onRehydrateStorage` callback baru navigate.
- Satu format `state.from` = selalu `Partial<Location>` object.

---

### UF-02 — Sidebar Links Tidak Lengkap (Settings & Excuse Saya Hilang)
**Severity:** moderate  
**File:** [Layout.tsx:51-94](file:///C:/Users/shink/Pictures/absenyura/src/components/Layout.tsx#L51-L94)

**Masalah:**
1. **Link `/settings` (Pengaturan Akun)** HILANG dari sidebar. Hanya accessible via UserDropdown avatar (2 klik). Untuk mobile UX, 1 klik di sidebar lebih baik.
2. **Link `/excuses/me` (Pengajuan Izin SAYA)** HILANG dari sidebar. Role USER memiliki 2 halaman: `/excuses` (untuk ADMIN approval) dan `/excuses/me` (izin pribadi). Tapi sidebar hanya 1 item. USER tidak punya pintas ke daftar izin pribadi.
3. **DESKTOP vs MOBILE PublicNavbar tidak sinkron** ([PublicNavbar.tsx:14-52](file:///C:/Users/shink/Pictures/absenyura/src/components/PublicNavbar.tsx#L14-L52)): Desktop punya grouped dropdown (Info, Organisasi, Media, Recruitment). Mobile flat tanpa grouping. Kedua struktur di-maintain TERPISAH — mudah lupa update salah satu.

**Fix:**
- Tambahkan `/settings` di bawah `/master-data` atau di UserDropdown dipindah ke sidebar (karena Settings = halaman penuh, bukan quick action).
- Tambahkan conditional: jika `role === 'USER'` → tampilkan link `/excuses/me` sebagai item terpisah. Jika ADMIN → kedua item (/excuses approval + /excuses/me).
- Refactor PublicNavbar: SUMBER DATA TUNGGAL `NAV_GROUPS` array, desktop & mobile render dari sumber sama.

---

### UF-03 — Route Dead Ends & Halaman 403 Tanpa Navigasi Keluar
**Severity:** moderate  
**Files:** [App.tsx](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx)

**Masalah:**
1. **Route `/other`** ([692-699](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L692-L699)): Dead end. "Coming Soon" di dalam `<Layout />` (ada sidebar tapi tanpa aksi keluar). TIDAK ADA yang link ke sini.
2. **`/kegiatan` → `/informasi`** ([383-389](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L383-L389)): Redirect tanpa toast info. User tidak tahu dialihkan.
3. **`/403-forbidden` → `/forbidden`** ([702-709](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L702-L709)): Redirect tanpa generator. Tidak berguna.
4. **`/sessions/:id/qr` CONTENT_ADMIN trap** ([447-457](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L447-L457)): Route ini LUAR `<Layout />` (tidak ada navbar/sidebar). CONTENT_ADMIN ketik URL manual → 403 TANPA TOMBOL KELUAR via UI (hanya bisa back browser).
5. **NotFound untuk non-auth user** ([718-725](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L718-L725)): Tombol "Kembali ke Dashboard" untuk user guest → akan gagal → redirect login → bingung.
6. **Double ProtectedRoute Nesting** ([447](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L447) outer tanpa roles + inner per-halaman): Dua lapis redirect. UX double-flash.
7. **`<Router>` posisi terlalu dalam** ([337](file:///C:/Users/shink/Pictures/absenyura/src/App.tsx#L337)): Dibuat SETELAH loading check. Jika PageSkeleton nanti pakai `useLocation` → crash.

**Fix:**
- Hapus 3 dead routes. Tambahkan toast.info pada redirect jika perlu backward compatibility.
- Wrap `/sessions/:id/qr` di dalam Layout, ATAU Forbidden page wajib punya tombol "Kembali ke Dashboard" / "Kembali ke Beranda" sendiri.
- NotFound: conditional button — authenticated → Dashboard, guest → Login + Beranda Publik.
- Naikkan `<BrowserRouter>` ke root (luar loading check).

---

### UF-04 — Logout Tidak Ada Konfirmasi + Tombol Back Setelah Logout Gagal
**Severity:** moderate  
**File:** [UserDropdown.tsx:41-49](file:///C:/Users/shink/Pictures/absenyura/src/components/UserDropdown.tsx#L41-L49)

**Masalah:** Klik "Keluar" → langsung logout tanpa ConfirmModal. Jika user sedang edit form dengan perubahan belum disimpan (dan EFF-01 membuat dirty guard tidak bekerja), data hilang permanen. Juga `navigate('/login')` tanpa `{ replace: true }` → tombol Back browser membawa kembali ke protected page → ProtectedRoute redirect login lagi.

**Fix:**
- Bungkus logout handler dengan ConfirmModal "Apakah Anda yakin ingin keluar? Perubahan yang belum disimpan akan hilang."
- Gunakan `navigate('/login', { replace: true })`.

---

### UF-05 — Post-Submit Redirect Tidak Wait for State Update / Toast
**Severity:** minor  
**Files:** [Attend.tsx:702-705](file:///C:/Users/shink/Pictures/absenyura/src/pages/Attend.tsx#L702-L705), [Classes.tsx:226](file:///C:/Users/shink/Pictures/absenyura/src/pages/Classes.tsx#L226), [Attend.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Attend.tsx) baris 324, 654

**Masalah:** `toastSuccess()` → `navigate()` segera. Toast kadang setengah muncul kemudian halaman berganti (fade out tertinggal di halaman baru). Classes navigate ke ClassStudents sebelum SWR cache refresh → stale data sebentar. Attend selalu navigate ke `/dashboard` setelah check-in, tanpa mempertimbangkan halaman ASAL user masuk (misal user masuk dari Sessions page via tombol QR → harusnya kembali ke Sessions, bukan Dashboard).

**Fix:**
- `setTimeout(() => navigate(...), 400)` untuk pastikan toast muncul minimal 400ms.
- Gunakan `navigate(-1)` jika location.state.from tidak ada.
- Panggil `mutate()` sebelum navigate.

---

### UF-06 — OpenRecruitment Login Redirect Kehilangan Search Params
**Severity:** minor  
**File:** [OpenRecruitment.tsx:294](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/OpenRecruitment.tsx#L294) + [postLoginTarget.ts:40-43](file:///C:/Users/shink/Pictures/absenyura/src/lib/auth/postLoginTarget.ts#L40-L43)

**Masalah:** User klik "Daftar" → belum login → redirect ke `/login` dengan state. `postLoginTarget` hanya ambil `from?.pathname` — **`search` params (misal `?form=openrecruitment-form`) hilang**. Setelah login, user ke halaman OpenRecruitment TANPA auto-scroll ke form pendaftaran.

**Fix:** Gunakan `createPath({ pathname: from.pathname, search: from.search, hash: from.hash })` untuk restore full URL.

---

## 🎨 KATEGORI 3: UI/UX FLAWS

### UX-01 — Button Action Variant Tidak Konsisten
**Severity:** moderate  
**Files:** Seluruh halaman admin & publik. Summary di [ConfirmModal.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ConfirmModal.tsx#L31-L35), [button.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/button.tsx)

**Delete Button Chaos:**
- **Pakai `variant="destructive"` (BENAR):** Sessions baris 667, Users baris 567, PublicSiteGalleries 467/553, PublicSitePosts 816/888, PublicSitePrograms 388/476.
- **Pakai `variant="ghost"` (SALAH — tidak menandakan destructive):** Sessions baris 831/852/1253/1278, Locations baris 856/866, Classes baris 447/459, ClassStudents baris 397/409.

**Edit Button Chaos:**
- Sessions/Users/Locations pakai `variant="outline"`.
- Reports baris 968 & Excuses baris 1049/1087 pakai `variant="ghost"`.

**Green "Success" Buttons Bypass Variant:**
- Attend.tsx:1286 (Ambil Foto), Users.tsx:444/1047, Reports.tsx:639 — SEMUA hardcoded `bg-emerald-600 hover:bg-emerald-700` — TIDAK ADA variant `success` di button.tsx.

**ConfirmModal 3 Custom Variants (Tidak di Button system):**
```
danger  → 'bg-rose-600 hover:bg-rose-700'   (harusnya variant="destructive")
warning → 'bg-orange-600 hover:bg-orange-700' (tidak ada di button)
default → 'bg-brand hover:bg-brand/90'
```

**Fix:**
- TAMBAHKAN `variant="success"` dan `variant="warning"` ke [button.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/button.tsx) (pakai semantic token).
- Delete primary action: SELALU `destructive`. Delete row-level (secondary): `variant="ghost"` DENGAN `text-destructive` class.
- Hapus className override di ConfirmModal — ganti `<Button variant="destructive">` / `<Button variant="warning">`.
- Refactor 4 tombol `bg-emerald-600` → `<Button variant="success">`.

---

### UX-02 — 6 Implementasi Loading Skeleton Berbeda (Base Skeleton Broken)
**Severity:** moderate  
**Files:** [skeleton.tsx:8](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/skeleton.tsx#L8), [PageSkeleton.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/PageSkeleton.tsx), [DashboardSkeleton.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/admin/DashboardSkeleton.tsx), [PublicHome.tsx:700,788](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/PublicHome.tsx#L700-L788), [PublicSectionBody.tsx:34-38](file:///C:/Users/shink/Pictures/absenyura/src/components/public/PublicSectionBody.tsx#L34-L38)

**Masalah:**
1. **Base [skeleton.tsx:8](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/skeleton.tsx#L8)** — Light mode: `bg-slate-200/90`. Dark mode: `bg-muted`. **INKONSISTEN tone.** Light mode skeleton tidak cocok dengan background sekitar yang memakai `bg-muted`. Ini mempengaruhi SEMUA 5 implementasi skeleton lain.
2. **[PageSkeleton.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/PageSkeleton.tsx#L8-L10)** — 3 `<div>` inline `animate-pulse bg-slate-200/90` MANUAL. Tidak menggunakan komponen `<Skeleton>`.
3. **[PublicHome.tsx:700](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/PublicHome.tsx#L700)** — `<div className="h-40" aria-busy="true" />` KOSONG. Tidak ada pulse, tidak ada Skeleton component.
4. **[PublicHome.tsx:788](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/PublicHome.tsx#L788)** — Bahkan tanpa `aria-busy`.
5. **[PublicSectionBody.tsx:34-38](file:///C:/Users/shink/Pictures/absenyura/src/components/public/PublicSectionBody.tsx#L34-L38)** — SATU KOTAK BESAR `h-40` untuk SEMUA section (Informasi Lomba shape berbeda dari Galeri).
6. **DashboardAdminSkeleton + DashboardUserSkeleton** (file sama line 29 & 66): 80% struktur identik (4 StatCard, banner, list side) — copy-paste 60+ baris tanpa prop `variant`.

**Fix (berurutan P1-P5):**
1. `skeleton.tsx:8` → `bg-muted` (memperbaiki semua sekaligus).
2. `PageSkeleton.tsx` → render `<Skeleton className="h-4 w-full" />` x3.
3. PublicHome inline loading → `<Skeleton>` berbentuk sesuai konten + aria-busy/aria-hidden.
4. PublicSectionBody skeleton → prop `skeletonShape="grid" | "list" | "single"` dengan tinggi sesuai.
5. Gabung 2 Dashboard skeleton → prop `variant="admin" | "user"`.

---

### UX-03 — Missing ARIA Labels & Semantic Roles di Publik Pages
**Severity:** moderate  
**Files:** [Galeri.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Galeri.tsx#L93-L144), [PublicHome.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/PublicHome.tsx#L711-L780), [OpenRecruitment.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/OpenRecruitment.tsx#L273), [PublicSectionBody.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/public/PublicSectionBody.tsx#L41-L48)

**Masalah:**
| Lokasi | Element | Seharusnya |
|---|---|---|
| Galeri.tsx:93-110 | `<button>` pilih album perulangan | `aria-label={`Pilih album ${a.title}`}` |
| Galeri.tsx:144 | `<button>` buka lightbox per foto | `aria-label={`Perbesar foto ${it.caption || a.title}`}` |
| PublicHome.tsx:711 | `<button>` retry "Muat ulang program" | `aria-label="Muat ulang program kerja"` |
| OpenRecruitment.tsx:273 | `<button>` "Tutup" modal detail | `aria-label="Tutup detail rekrutmen"` |
| PublicSectionBody.tsx:41-48 | Inline empty state | `role="status"` (seperti PublicEmptyState) |
| PublicHome.tsx:702 | Inline error state | `role="alert"` (seperti ErrorWithRetry) |
| Semua inline empty Galeri, OpenRecruitment | 4 lokasi | `role="status"` |

**Fix:** Tambahkan label per mapping di atas. Aktifkan ESLint `jsx-a11y/control-has-associated-label` + `jsx-a11y/aria-role`.

---

### UX-04 — Responsive Grid & Toolbar Button Inconsistency
**Severity:** minor  
**Files:** [Classes.tsx:317](file:///C:/Users/shink/Pictures/absenyura/src/pages/Classes.tsx#L317), [Galeri.tsx grid](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/Galeri.tsx), [Attend.tsx:1262-1286](file:///C:/Users/shink/Pictures/absenyura/src/pages/Attend.tsx#L1262-L1286), [PublicSitePrograms.tsx:288-306](file:///C:/Users/shink/Pictures/absenyura/src/pages/publicSiteAdmin/PublicSitePrograms.tsx#L288-L306) + CMS dialogs lainnya

**Masalah:**
1. **Grid Classes page** hanya max 2 kolom (default + `sm:2`), TIDAK PERNAH 3. Pada layar >=1280px, ClassCard menampilkan whitespace BESAR di sisi kanan — tidak seimbang dengan Publik cards/Galeri yang 3 kolom.
2. **Galeri grid** lompat `sm:2` → `lg:3` (tidak ada `md:2` atau `md:3`). Breakpoint md (768-1023px) hanya tampil 2 kolom padahal ada ruang.
3. **AdminPageShell SUDAH BAIK** pakai utility `[&_button]:w-full [&_button]:sm:w-auto` tapi halaman lain (Attend buttons line 1262/1278/1286, PublicSitePrograms Cancel+Submit, Excuses DialogFooter) LIST MANUAL `w-full sm:w-auto` tiap button atau bahkan TIDAK PAKAI → di mobile, tombol submit hanya sebagian kecil layar.
4. **Radius card tidak seragam**: Dashboard hero `rounded-3xl`, ClassCard `rounded-2xl`, Publik cards `rounded-2xl` — tidak ada aturan semantic.

**Fix:**
- Classes grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Galeri grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3`.
- Tambahkan `[&_button]:w-full [&_button]:sm:w-auto` ke DialogFooter global atau util class `dialog-actions`.
- Buat design token: `radius.card = 1rem (rounded-2xl)` dan `radius.hero = 1.5rem (rounded-3xl)` lalu gunakan konsisten.

---

### UX-05 — Dashboard & Publik Buttons Bypass `<Button>` Component
**Severity:** minor  
**Files:** [Dashboard.tsx](file:///C:/Users/shink/Pictures/absenyura/src/pages/Dashboard.tsx#L210-L218), [PublicHome.tsx:713,754,780](file:///C:/Users/shink/Pictures/absenyura/src/pages/public/PublicHome.tsx#L713-L780)

**Masalah:**
- Dashboard.tsx line 210: CTA `bg-white font-bold text-indigo-700 hover:bg-indigo-50` — BYPASS variant total.
- Dashboard.tsx line 194 & 218: `bg-gradient-to-r from-indigo-600 to-violet-600` duplicate 2x tanpa class utility.
- PublicHome.tsx line 754: `<Link>` raw dengan `shadow-[0_16px_32px_rgba(37,99,235,0.35)]` arbitrary shadow.
- PublicHome.tsx line 780: `<Link>` raw `border-black/10 bg-white px-6 py-3`.
- PublicHome.tsx line 713: Raw retry button inline styling.

Semua ini TIDAK mengikuti `shadow-md`, `ring-offset-background`, focus states, dan disabled states dari Button component design system.

**Fix:**
- Semua button → `<Button asChild>` + variant yang sesuai (default, outline, secondary).
- Buat `className="btn-hero-gradient"` utility di tailwind config untuk gradient hero agar tidak copy-paste.

---

### UX-06 — Touch Target Size Below WCAG 44px for Navbar Ghost Buttons
**Severity:** minor  
**Files:** [ThemeToggle.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/ThemeToggle.tsx), [PublicNavbar.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/PublicNavbar.tsx), [NotificationMenu.tsx](file:///C:/Users/shink/Pictures/absenyura/src/components/NotificationMenu.tsx) trigger

**Masalah:** Design system Button default `h-10` (40px) < WCAG 2.5.5 Target Size minimum 44x44px. Ghost buttons di navbar (ThemeToggle, Notification bell, Hamburger) kadang hanya `p-2` tanpa eksplisit height = beragam antara 36-40px tergantung icon.

**Fix:** Naikkan default Button height ke `h-11` (44px), ATAU setidaknya ghost interactive di navbar `min-h-[44px] min-w-[44px]`.

---

## 📊 RINGKASAN SEVERITY & KUANTITAS

| Severity | Jumlah Temuan |
|---|---|
| **Critical** | 5 (EFF-01, SYS-05, SYS-08, UF-01, UF-02 sebagian) |
| **Moderate** | 21 (SYS-01 s/d SYS-04, SYS-06, SYS-07, EFF-02 s/d EFF-07, UF-03 s/d UF-04, UX-01 s/d UX-03) |
| **Minor** | 8 (EFF-04, EFF-08, UF-05, UF-06, UX-04 s/d UX-06) |
| **Systemic Patterns** | 8 (SYS-01 s/d SYS-08 — mempengaruhi 4-25+ file per pola) |

**Total temuan:** **34 issues** (termasuk 8 systemic pattern yang mencakup banyak sub-issue)

---

## 🎯 URUTAN PRIORITAS PERBAIKAN (Roadmap yang Disarankan)

### P0 — Critical (Blocker / Data Loss / Scale Risk)
1. **EFF-01 + UF-04** — Perbaiki `useFormDirtyGuard` (pindah Data Router ATAU fallback) + Logout konfirmasi. *Mencegah data loss user.*
2. **SYS-08** — Tambah 8 index DB di migration baru. *Mencegah slow query seiring jumlah user tumbuh.*
3. **SYS-05 (cron N+1 bagian 1)** — Fix cron attendance loop + photo cleanup (`fs.promises.unlink`). *Mencegah cron timeout.*
4. **UF-01** — Standardisasi logout util, session expiry toast, post-login sync. *Mencegah kebingungan user logout diam-diam.*

### P1 — High (Signifikan UX / Perf)
5. **SYS-03 bagian skeleton** — [skeleton.tsx:8](file:///C:/Users/shink/Pictures/absenyura/src/components/ui/skeleton.tsx#L8) `bg-slate-200 → bg-muted`. *Memperbaiki 6 skeleton implementasi sekaligus.*
6. **EFF-02** — Hapus `pdfmake` dead dep + manualChunks tambahan `vendor-icons` & `vendor-date` + devDep fix.
7. **SYS-04** — Global SWR `dedupingInterval: 30000` untuk publik endpoints.
8. **SYS-07** — Satu standar toast duration, larang `toast.success()` langsung.
9. **UF-03 (dead routes)** — Hapus `/other`, `/403-forbidden`, naikkan Router position, fix NotFound buttons.
10. **SYS-05 (cron N+1 bagian 2)** — Batch notification.createMany, COUNT groupBy semester, Set includes.

### P2 — Medium (DX / Konsistensi Jangka Panjang)
11. **UX-01** — Tambah `success`/`warning` variants ke Button.tsx, hapus override di ConfirmModal, ganti 4+ emerald hardcode.
12. **SYS-06** — Extract 4 enrollment checks + 2 fingerprint validation + 2 QR validation + pagination util bersama.
13. **SYS-02** — Replace 10 inline empty states dengan `<PublicEmptyState>` komponen.
14. **EFF-03** — Dynamic `qrcode` import, lazy NotificationMenu, date-fns re-export pusat.
15. **UX-02 (skeleton variants)** — PageSkeleton pakai komponen, PublicHome inline loading di-Skeleton-kan.
16. **UX-03** — Tambah semua aria-label + semantic roles yang hilang.
17. **SYS-01 (useCallback massal)** — useMutationToast + Sessions/Attend/Classes/Fungsionaris handlers.
18. **EFF-05** — Lengkapi useEffect deps + aktifkan exhaustive-deps sebagai error.

### P3 — Low-Medium
19. **SYS-03 (palette batch)** — Refactor PublicLayout/Footer/Navbar → theme tokens, badge.tsx → semantic tokens, LastSavedIndicator → semantic tokens.
20. **UF-02** — Tambah `/settings` & `/excuses/me` ke sidebar, PublicNavbar single source of truth.
21. **UX-04** — Grid 3-col Classes, `[&_button]:w-full` di dialogs, radius card standard.
22. **EFF-06** — Upload foto async fire-and-forget (awaited → void catch).

### P4 — Nice to Have
23. **EFF-07** — Hapus `queryWithSemesterFallback` setelah migration dikonfirmasi semua env.
24. **EFF-08** — Barrel exports publik pages.
25. **EFF-04** — Naikkan PWA cache limit ATAU refactor export server-side (hilangkan exceljs client).
26. **UF-05/06** — Post-submit delay navigate, OpenRecruitment search params restore.
27. **UX-05** — Dashboard/PublicHome raw buttons → `<Button asChild>`.
28. **UX-06** — WCAG 44px touch targets navbar icons.
