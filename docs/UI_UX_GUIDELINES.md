# Panduan Konsistensi UI/UX — HMSDP E-Absensi

Versi detail. Dokumen ini melengkapi `docs/design.md` yang sudah ada — bukan menggantikan. Setiap aturan di sini diverifikasi langsung dari kode yang ada sekarang (bukan cuma dari catatan audit lama), jadi ada bagian yang mengonfirmasi sesuatu sudah diperbaiki, dan ada yang menunjukkan primitive-nya ada tapi belum dipakai merata.

**Cara pakai:** simpan sebagai `docs/UI_UX_GUIDELINES.md`. Tempel §9 (Definition of Done) ke template Pull Request. Tempel §10 (prompt AI assistant) setiap kali minta AI coding assistant membuat/mengedit halaman.

---

## 1. Status saat ini — apa yang sudah benar vs. apa yang masih bocor

Supaya tidak salah asumsi: sebagian primitive di bawah **sudah diperbaiki** sejak audit `full-codebase-audit_20260908.md`. Tabel ini pakai bukti hitung langsung dari codebase, bukan asumsi.

| Primitive                                                                                    | Status sekarang                                                                                        | Bukti                                                                                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `skeleton.tsx` warna                                                                         | ✅ Sudah benar — pakai `bg-muted` (bukan `bg-slate-200/90` seperti temuan audit lama)                  | Baca langsung `src/components/ui/skeleton.tsx`                                              |
| `WizardStepIndicator` a11y langkah                                                           | ✅ Sudah ada `<span className="sr-only">Langkah {currentStep} dari {labels.length}</span>`             | Baca langsung komponen                                                                      |
| `LastSavedIndicator` (saving/dirty/saved)                                                    | ✅ Komponen sudah lengkap 3 state + `aria-live="polite"`                                               | `src/components/admin/LastSavedIndicator.tsx`                                               |
| Helper toast (`toastSuccess`/`toastError`/`toastWarning`/`toastInfo`) dengan durasi tetap    | ✅ Sudah ada, durasi terdefinisi jelas (lihat §5)                                                      | `src/lib/utils/toastMessage.ts`                                                             |
| `useDialogA11y` (focus trap + ESC + restore focus)                                           | ✅ Hook sudah lengkap dan benar                                                                        | `src/hooks/useDialogA11y.ts`                                                                |
| `button.tsx` varian `success`/`warning`                                                      | ✅ Sudah ada di sistem                                                                                 | `src/components/ui/button.tsx`                                                              |
| `badge.tsx` varian `sick`/`excused` terpisah dari `secondary`                                | ✅ Sudah ada                                                                                           | `src/components/ui/badge.tsx`                                                               |
| **Tapi:** pemakaian `toast.success()`/`toast.error()` langsung dari `sonner` (bypass helper) | ❌ Masih terjadi di ~35–40% pemanggilan                                                                | `toast.success(` muncul 32× vs `toastSuccess(` 29×; `toast.error(` 38× vs `toastError(` 47× |
| **Tapi:** `bg-emerald-*`/`bg-rose-*`/`bg-red-*` hardcoded di luar file komponen              | ❌ Masih ~25+ kemunculan tersebar                                                                      | grep `bg-emerald-[0-9]00` dkk di seluruh `src/`                                             |
| **Tapi:** `variant="ghost"` dipakai untuk aksi hapus                                         | ❌ 52 pemakaian `variant="ghost"` vs 15 `variant="destructive"`                                        | grep di seluruh halaman                                                                     |
| **Tapi:** radius kartu campur                                                                | ❌ `rounded-xl` (96×), `rounded-2xl` (82×), `rounded-3xl` (34×), `rounded-lg` (27×) tanpa aturan pasti | grep radius di seluruh `src/`                                                               |
| **Tapi:** `select.tsx` masih `focus:` bukan `focus-visible:`                                 | ❌ Outlier di antara 100+ pemakaian `focus-visible:ring` yang sudah benar                              | Baca `src/components/ui/select.tsx`                                                         |
| **Tapi:** token `--radius-card: 0.5rem` di `index.css`                                       | ❌ Nyaris tidak dipakai — halaman langsung menulis `rounded-xl`/`rounded-2xl`/`rounded-3xl` literal    | Token didefinisikan tapi tidak direferensikan sebagai class Tailwind manapun                |

**Pelajaran:** tim (atau AI assistant) yang pernah membenahi satu primitive **tidak melakukan pass ulang** ke semua tempat yang seharusnya memakainya. Solusinya bukan menulis ulang komponen — komponennya sudah bagus — tapi retrofit pemakaian + penegakan supaya tidak longgar lagi (§11).

---

## 2. Design tokens — lengkap dengan nilai mentah

### 2.1 Warna (HSL, dari `src/index.css`)

| Token                               | Light                                 | Dark                                    | Dipakai untuk                                                                     |
| ----------------------------------- | ------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| `--background` / `--foreground`     | `0 0% 100%` / `222.2 84% 4.9%`        | `222.2 84% 4.9%` / `210 40% 98%`        | Latar & teks dasar                                                                |
| `--card`                            | `0 0% 100%`                           | `217.2 32.6% 12%`                       | Panel admin                                                                       |
| `--muted` / `--muted-foreground`    | `210 40% 96.1%` / `215.4 16.3% 46.9%` | `217.2 32.6% 17.5%` / `215 20.2% 65.1%` | Latar sekunder, teks pendukung                                                    |
| `--border` / `--input`              | `214.3 31.8% 91.4%`                   | `217.2 32.6% 17.5%`                     | Garis panel, outline input                                                        |
| `--destructive`                     | `0 84.2% 60.2%`                       | `0 62.8% 30.6%`                         | Aksi bahaya                                                                       |
| `--ring`                            | `222.2 84% 4.9%`                      | `212.7 26.8% 83.9%`                     | Focus ring default                                                                |
| `--brand-primary-hex`               | `#2f80ed`                             | sama                                    | Aksen brand — **hex ini yang dipakai sebagai `bg-brand`, bukan var HSL terpisah** |
| `--sidebar-bg` / `--sidebar-border` | `220 33% 97%` / `214 32% 91%`         | `222.2 47% 6%` / `217.2 32.6% 17.5%`    | Khusus shell admin, jangan dipakai di publik                                      |
| `--nav-active-bg`                   | `214 100% 97%`                        | `214 84% 56% / 0.15`                    | Highlight menu aktif sidebar                                                      |

Warna semantik status (emerald/amber/rose/blue/purple) **tidak** didefinisikan sebagai CSS var terpisah — dia hidup sebagai bagian dari `variant` di `button.tsx`/`badge.tsx`. Ini yang membuatnya gampang di-bypass (developer tinggal tulis `bg-emerald-600` tanpa lewat variant). Rekomendasi jangka menengah: naikkan jadi token (`--success`, `--warning`) di `index.css` seperti `--destructive`, supaya konsisten dengan pola token lain dan lebih mudah di-lint.

### 2.2 Radius

| Token/Class                                     | Nilai          | Cakupan resmi                                  | Realitas                                                                                 |
| ----------------------------------------------- | -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `--radius` (`rounded-md`)                       | `0.5rem` (8px) | Input, Select, Button                          | Konsisten ✅                                                                             |
| `--radius-card` (didefinisikan, jarang dipakai) | `0.5rem` (8px) | Dimaksudkan generik untuk "kartu"              | Nyaris tidak direferensikan — halaman pakai literal class                                |
| `rounded-lg`                                    | 8px            | Kartu admin (`ClassCard`, dll)                 | Konsisten dipakai tapi bersaing dengan `rounded-xl` untuk fungsi serupa                  |
| `rounded-xl`                                    | 12px           | Panel admin (`AdminPageShell`), modal          | Paling banyak dipakai (96×) — termasuk di beberapa tempat yang harusnya `rounded-lg`     |
| `rounded-2xl`                                   | 16px           | Kartu konten publik (program, galeri, artikel) | Konsisten untuk kartu publik, tapi kadang tertukar dengan `rounded-3xl` di section besar |
| `rounded-3xl`                                   | 24px           | Hero image, panel struktur besar, CTA band     | Dipakai benar untuk elemen besar, jarang salah tempat                                    |

**Aturan final (pilih satu skala per konteks, jangan campur):**

- Kontrol (button, input, select, badge pill) → `rounded-md`/`rounded-full`.
- Kartu admin/grid kelas/list item → `rounded-lg`.
- Panel/modal/dialog admin → `rounded-xl`.
- Kartu konten publik (program, berita, galeri) → `rounded-2xl`.
- Hero, section besar, CTA band publik → `rounded-3xl`.

### 2.3 Tipografi

| Peran                                                | Font               | Class          | Catatan                                                                                       |
| ---------------------------------------------------- | ------------------ | -------------- | --------------------------------------------------------------------------------------------- |
| UI umum (semua teks admin, body publik, form, tabel) | Plus Jakarta Sans  | `font-sans`    | Default — jangan override kecuali hero                                                        |
| Judul hero publik SAJA                               | Cormorant Garamond | `font-display` | Dipakai italic besar di hero PublicHome — **jangan** dipakai di card title, badge, atau admin |

Skala ukuran yang sudah dipakai konsisten di hero: `text-4xl`/`text-5xl` (mobile→desktop) untuk headline hero, `text-2xl` untuk judul section admin (`AdminPageShell`), `text-sm` untuk deskripsi/label. Pertahankan 3 tingkat ini (headline / section title / body-label) — jangan menambah ukuran ad hoc di antaranya.

### 2.4 Motion & animasi (sistem sudah ada di `index.css` — patuhi, jangan tulis animasi baru sembarangan)

Ada sistem animasi yang sudah dirancang dengan baik di `src/index.css`. Tiga aturan wajib yang sudah ditulis sebagai komentar di sana dan **berlaku untuk animasi apa pun yang ditambahkan ke project ini**:

1. **Hanya animasikan `transform`, `opacity`, `filter`** (compositor/GPU). Dilarang animasikan `width`, `height`, `top`, `color` langsung — memicu layout/paint, bikin INP jelek.
2. **`prefers-reduced-motion: reduce` sudah di-guard global** (`animation-duration: 0.01ms !important` dst) — jangan buat exception baru yang mem-bypass ini.
3. **Jangan taruh animasi apa pun di hero/above-the-fold/LCP.** Animasi hanya untuk konten di bawah fold, supaya LCP dan CLS tidak terganggu.

Class animasi siap pakai yang sudah ada — pakai ini dulu sebelum menulis animasi custom baru:

| Class                                       | Fungsi                                                               | Dipakai di                          |
| ------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| `.card-hover-lift`                          | Hover lift 2px + shadow, 220ms                                       | Kartu admin, StatCard, kartu publik |
| `.reveal-scroll` + `.reveal-scroll-visible` | Fade+slide+blur saat masuk viewport (pasangkan dengan `useInView()`) | Section below-fold                  |
| `.stagger-reveal-1` … `.stagger-reveal-6`   | Delay 60–460ms berjenjang untuk grid/list                            | Grid StatCard, grid kartu           |
| `.smooth-state-toggle`                      | Transisi halus saat state berubah (badge, indicator)                 | `LastSavedIndicator`, badge status  |
| `.public-enter`                             | Entrance below-fold halaman publik                                   | Section publik non-hero             |

---

## 3. Tombol (Button) — detail per variant

Definisi asli (`src/components/ui/button.tsx`):

```ts
variant: default | destructive | success | warning | outline | secondary | ghost | link
size: default (h-10) | sm (h-9) | lg (h-11) | icon (h-10 w-10)
```

| Variant       | Kapan pakai                                                                         | Contoh nyata di project                                                                                                                        | JANGAN                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `default`     | Aksi utama satu per section/form (submit, simpan, lanjut wizard)                    | Tombol "Simpan" di form CMS                                                                                                                    | Dua `default` bersisian dalam satu form — bikin user bingung mana prioritas                                                        |
| `destructive` | Hapus/keluarkan permanen, di toolbar MAUPUN row-level tabel                         | `Sessions.tsx` baris 667, `Users.tsx` baris 567 (sudah benar)                                                                                  | `variant="ghost"` untuk fungsi ini — ada 52 kejadian salah ini yang harus dirapikan bertahap                                       |
| `success`     | Aksi positif eksplisit: approve, checkout, ambil foto                               | Seharusnya dipakai untuk `Attend.tsx:1286` "Ambil Foto", `Users.tsx:444/1047`, `Reports.tsx:639` yang sekarang masih hardcode `bg-emerald-600` | Menulis `className="bg-emerald-600 hover:bg-emerald-700"` — variant sudah ada, tinggal pakai                                       |
| `warning`     | Butuh perhatian tapi belum destruktif (reject sementara, override manual)           | `ConfirmModal` variant custom `warning` (`bg-orange-600`) — harusnya diganti manggil `<Button variant="warning">`                              | Custom className `bg-orange-600` di `ConfirmModal.tsx`                                                                             |
| `outline`     | Aksi sekunder yang perlu terlihat sebagai tombol (Batal di dialog, Edit di toolbar) | `Sessions.tsx`/`Users.tsx`/`Locations.tsx` Edit                                                                                                | —                                                                                                                                  |
| `secondary`   | Aksi sekunder tanpa border tegas (alternatif dari `outline`, bukan duplikat)        | —                                                                                                                                              | Memakai `outline` dan `secondary` bergantian untuk fungsi yang sama di halaman berbeda — pilih satu makna per fungsi dan konsisten |
| `ghost`       | Aksi tersier/icon-only dalam row tabel yang padat                                   | Ikon "Biodata mahasiswa" di `ClassStudents.tsx`                                                                                                | Dipakai untuk Hapus (lihat kolom `destructive` di atas)                                                                            |
| `link`        | Navigasi inline dalam teks/paragraf                                                 | —                                                                                                                                              | Dipakai sebagai pengganti `<Button variant="outline">` untuk CTA yang seharusnya terlihat sebagai tombol                           |

**Target sentuh (WCAG 2.5.5, minimum 44×44px):**

- `size="default"` = `h-10` (40px) — **di bawah standar**. Untuk tombol berdiri sendiri di breakpoint mobile, pakai `size="lg"` (`h-11`/44px) atau tambahkan `min-h-11` eksplisit.
- `size="icon"` = `h-10 w-10` (40px) — sama masalahnya. Untuk icon button navbar (`ThemeToggle`, notifikasi, hamburger), tambahkan `min-h-11 min-w-11` di className pemanggil, karena default `size="icon"` tidak cukup.
- Konvensi project yang sudah benar di banyak tempat: `min-h-11` — pertahankan, tinggal disiplinkan ke navbar icon button yang masih terlewat.

**Contoh perbaikan konkret (before/after) untuk pola paling sering salah:**

```tsx
// ❌ SEBELUM — ditemukan di beberapa halaman (Attend.tsx, Users.tsx, Reports.tsx)
<button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2">
  Ambil Foto
</button>

// ✅ SESUDAH
<Button variant="success">Ambil Foto</Button>
```

```tsx
// ❌ SEBELUM — ConfirmModal custom variant className
<button className={cn(
  variant === 'danger' && 'bg-rose-600 hover:bg-rose-700',
  variant === 'warning' && 'bg-orange-600 hover:bg-orange-700',
  variant === 'default' && 'bg-brand hover:bg-brand/90'
)}>

// ✅ SESUDAH — panggil Button dengan variant resmi, hapus className custom
<Button variant={variant === 'danger' ? 'destructive' : variant === 'warning' ? 'warning' : 'default'}>
```

---

## 4. Badge & warna status — pemetaan lengkap

| Status                    | Variant badge | Kelas warna (light)                               | Dipakai di              |
| ------------------------- | ------------- | ------------------------------------------------- | ----------------------- |
| PRESENT / Hadir           | `success`     | `bg-emerald-100 text-emerald-800`                 | Reports, History, Recap |
| LATE / Terlambat          | `warning`     | `bg-amber-100 text-amber-800`                     | Sama seperti di atas    |
| ABSENT / Alfa             | `destructive` | token `--destructive`                             | Sama                    |
| SICK / Sakit              | `sick`        | `bg-blue-100 text-blue-700 border-blue-200`       | Sama + Excuses          |
| EXCUSED / Izin            | `excused`     | `bg-purple-100 text-purple-700 border-purple-200` | Sama + Excuses          |
| PENDING (menunggu review) | `outline`     | `text-foreground border-border` (netral)          | Excuses list            |

**Kenapa PENDING harus `outline`, bukan `secondary`:** `secondary` (abu solid) sudah dipakai sebagai fallback lama untuk SICK/EXCUSED sebelum variant terpisah dibuat. Kalau PENDING juga pakai `secondary`, ketiganya (fallback lama SICK/EXCUSED + PENDING baru) akan terlihat sama abu-abu lagi — mengulang bug visual yang sama dengan alasan berbeda.

Role badge (`SUPER_ADMIN`/`ADMIN`/`USER`/`CONTENT_ADMIN`) harus lewat satu helper terpusat, misal:

```ts
// src/lib/utils/statusLabel.ts — tambahkan helper ini kalau belum ada
export function roleBadgeVariant(role: Role): BadgeVariant {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'default'; // brand blue — paling tinggi otoritas
    case 'ADMIN':
      return 'secondary';
    case 'CONTENT_ADMIN':
      return 'outline';
    case 'USER':
      return 'sick'; // reuse token biru netral, BUKAN custom purple/sky
  }
}
```

Jangan menulis `className="bg-purple-600"` / `className="bg-sky-600"` langsung di `Users.tsx`, `StudentDetail.tsx`, atau halaman lain yang menampilkan role — semua panggil helper yang sama.

---

## 5. Toast & feedback pasca-aksi

**Selalu panggil helper, jangan `sonner` langsung:**

```ts
// src/lib/utils/toastMessage.ts — SUDAH ADA, pakai ini
toastSuccess(message); // duration 3500ms, auto-truncate 80 char
toastError(err, fallback); // duration 5000ms, auto-truncate 80 char, extract message dari error object
toastWarning(message); // duration 4000ms, boleh sampai 100 char
toastInfo(message); // duration 4000ms, boleh sampai 100 char
```

```tsx
// ❌ SEBELUM — ~35% pemanggilan di codebase masih begini
toast.success('Sesi berhasil dibuat');
toast.error('Gagal menyimpan, coba lagi');

// ✅ SESUDAH
toastSuccess('Sesi berhasil dibuat');
toastError(err, 'Gagal menyimpan, coba lagi');
```

Kenapa ini penting bukan cuma soal rapi: `toastError` otomatis extract pesan asli dari error object (`getErrorMessage`) dan memotong ke 80 karakter supaya layout toast tidak pecah — kalau manggil `toast.error()` langsung dengan string manual, developer harus ingat sendiri untuk truncate, dan sering lupa.

**Untuk form yang bisa diedit lama (CMS editor, Settings):** pasang `<LastSavedIndicator lastSavedAt={...} isDirty={...} isSaving={...} />` di dekat tombol submit — komponennya sudah lengkap 3 state (Menyimpan.../Perubahan belum disimpan/Tersimpan X menit lalu), tinggal disambungkan ke state form. Ini mencegah user submit berulang karena ragu datanya kesimpan atau tidak.

**Form dengan potensi kehilangan banyak data** (CMS editor 6 halaman, form panjang manapun) **wajib** pasang `useFormDirtyGuard` — untuk navigasi dalam-app (React Router) maupun `beforeunload` saat user menutup tab.

---

## 6. Loading, kosong, dan error state

| State                     | Admin                                                                                                | Publik                                      | Aturan                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skeleton                  | `<Skeleton className="..." />` — bentuk sesuai konten asli (tinggi kartu, lebar teks)                | Sama                                        | **Dilarang** `<div className="h-40" />` kosong tanpa `animate-pulse`, dan **dilarang** satu kotak generik untuk semua jenis section (grid butuh skeleton grid, list butuh skeleton list) |
| Loading lambat (>3 detik) | `useSwrPageState` → destructure `showSlowLoadingHint` → render `<SlowLoadingHint onRetry={retry} />` | `<PublicSlowLoadingHint onRetry={retry} />` | Wajib destructure keempatnya (`isPending`, `isError`, `retry`, `showSlowLoadingHint`) — jangan cuma ambil dua yang pertama lalu lupakan sisanya                                          |
| Kosong                    | `<AdminEmptyState icon={...} title="..." description="..." action={...} />`                          | `<PublicEmptyState>`                        | Jangan bikin `<div className="border-dashed">` custom baru — 8+ halaman admin lain sudah pakai komponen bersama ini                                                                      |
| Error                     | `<ErrorWithRetry title="..." error={...} onRetry={...} />`                                           | `<PublicPageError>`                         | Sama — jangan custom per halaman                                                                                                                                                         |

**Copywriting untuk state ini** (ikuti nada yang sudah dipakai di project — netral, langsung, bahasa Indonesia, jelaskan apa yang terjadi + apa yang bisa dilakukan):

- Kosong: "Belum ada mahasiswa terdaftar di kelas ini." + aksi ("Tambahkan mahasiswa menggunakan formulir di atas.") — bukan sekadar "Data kosong".
- Error: sebutkan apa yang gagal, bukan pesan generik "Terjadi kesalahan" — pakai `getErrorMessage(err, fallback)` supaya pesan asli dari API muncul kalau ada.

---

## 7. Aksesibilitas — checklist wajib dengan implementasi rujukan

| Item                                                       | Wajib                                                                                | Cara implementasi (rujukan yang sudah benar di project)                                                                                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog/drawer custom (bukan Radix)                         | ESC menutup, focus trap, focus kembali ke trigger, `role="dialog" aria-modal="true"` | Panggil `useDialogA11y(open, onClose, { containerRef, triggerRef })` — **jangan** implementasi custom, hook ini sudah benar dan dipakai `PublicNavbar` tapi belum dipasang di `Layout.tsx` sidebar mobile admin                              |
| Toggle/switch button (cabinet switcher, filter chip aktif) | `aria-pressed={isSelected}` sinkron dengan state visual                              | Tambahkan di setiap tombol toggle custom (bukan `<Switch>` Radix)                                                                                                                                                                            |
| Tombol icon-only                                           | `aria-label` deskriptif, bukan generik                                               | `aria-label={`Pilih album ${a.title}`}`, bukan `aria-label="tombol"`                                                                                                                                                                         |
| Focus ring                                                 | `focus-visible:ring`, BUKAN `focus:ring` polos                                       | Hampir semua komponen sudah benar; `select.tsx` masih perlu diperbaiki ke `focus-visible:`                                                                                                                                                   |
| Step indicator / wizard                                    | Screen reader tahu "langkah X dari Y"                                                | Sudah ada via `<span className="sr-only">Langkah {currentStep} dari {labels.length}</span>` di `WizardStepIndicator` — pola ini valid, tidak wajib pakai `aria-posinset`/`aria-setsize` kalau sr-only text sudah menyampaikan info yang sama |
| Grup tombol berelasi                                       | `role="group" aria-label="..."`                                                      | 2 tombol recovery di `ErrorBoundary` (Muat Ulang + Ke Dashboard)                                                                                                                                                                             |
| Status message non-form (toast)                            | `aria-live="polite"` untuk info/sukses, `aria-live="assertive"` untuk error kritis   | `LastSavedIndicator` sudah `aria-live="polite"` — terapkan pola sama untuk toast error checkin/validasi                                                                                                                                      |
| Target sentuh                                              | ≥44×44px untuk semua elemen interaktif berdiri sendiri di breakpoint mobile          | Lihat §3                                                                                                                                                                                                                                     |
| Reduced motion                                             | Semua animasi baru otomatis tunduk ke guard global — jangan override                 | Lihat §2.4                                                                                                                                                                                                                                   |

---

## 8. Aturan per permukaan (extend dari `docs/design.md`)

|                              | Publik                                                                                                           | Admin                                                                                                                        | CMS (publicSiteAdmin)                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Karakter                     | Editorial, lega, gambar besar, animasi CSS ringan (bukan Framer di hero)                                         | Padat, operasional                                                                                                           | Form-heavy, risiko kehilangan data tinggi                                                                      |
| Radius dominan               | `rounded-2xl` (kartu) – `rounded-3xl` (hero/section besar)                                                       | `rounded-lg` (kartu) – `rounded-xl` (panel/modal)                                                                            | Ikut pola admin                                                                                                |
| Font judul                   | `font-display` untuk hero SAJA                                                                                   | Selalu `font-sans`                                                                                                           | Selalu `font-sans`                                                                                             |
| Breakpoint grid kartu        | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3` (jangan lompat dari `sm` langsung ke `lg` tanpa `md`) | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`                                                                                  | Biasanya form vertikal, bukan grid                                                                             |
| Tombol dialog/footer         | —                                                                                                                | `[&_button]:w-full [&_button]:sm:w-auto` di `DialogFooter` — jangan tulis manual `w-full sm:w-auto` di tiap tombol satu-satu | Sama seperti admin                                                                                             |
| Wajib tambahan               | `PublicReveal`/`PublicEnter` hanya below-fold, tidak di hero                                                     | `min-h-11` tap target breakpoint kecil                                                                                       | `useFormDirtyGuard` di setiap editor (6 halaman: Profile, Posts, Galleries, Programs, Structure, Recruitments) |
| Tabel data lebar (10+ kolom) | —                                                                                                                | Kolom identitas pertama (No + Nama) pakai `sticky left-0 z-[1] bg-card` supaya tidak hilang saat scroll horizontal di tablet | —                                                                                                              |

Jangan pindah pola admin (panel toolbar, grid kartu kelas, sidebar token `--sidebar-bg`) ke publik atau sebaliknya tanpa alasan kuat — ini prinsip dari `design.md` dan tetap berlaku di sini.

---

## 9. Definition of Done — checklist sebelum PR/commit UI

1. [ ] Tombol pakai `<Button variant="...">` sesuai tabel §3 — **tidak ada** `bg-{color}-600` hardcoded di className manapun.
2. [ ] Badge status pakai variant dari tabel §4 — tidak ada warna manual untuk status/role.
3. [ ] Toast pakai `toastSuccess`/`toastError`/`toastWarning`/`toastInfo` — **tidak** memanggil `toast.success()`/`toast.error()` dari `sonner` langsung.
4. [ ] Loading/empty/error pakai komponen bersama (§6) — tidak ada `<div className="h-40" />` kosong atau empty state custom baru.
5. [ ] Semua elemen klik berdiri sendiri ≥44px di breakpoint mobile (§3, §7).
6. [ ] Semua elemen klik pakai `focus-visible:ring`, bukan `focus:ring`.
7. [ ] Toggle/switch custom punya `aria-pressed`; dialog/drawer custom pakai `useDialogA11y`.
8. [ ] Radius mengikuti tabel §2.2 sesuai permukaan (publik vs admin) — tidak mencampur `rounded-2xl`/`rounded-3xl` untuk elemen setingkat di section yang sama.
9. [ ] Form yang bisa kehilangan banyak input → `useFormDirtyGuard` terpasang.
10. [ ] Animasi baru (kalau ada) hanya animasikan `transform`/`opacity`/`filter`, tidak dipasang di hero/LCP, dan pakai class siap pakai di §2.4 dulu sebelum menulis animasi custom.
11. [ ] Kalau menambah warna/varian baru → tambahkan sebagai variant resmi di `button.tsx`/`badge.tsx`/token `index.css`, bukan inline di halaman.

---

## 10. Prompt siap tempel untuk AI coding assistant

Tempel blok ini di awal instruksi setiap kali minta AI assistant (Claude Code, Cursor, dll) membuat atau mengedit halaman/komponen UI di project ini:

```
Sebelum menulis kode UI, patuhi docs/UI_UX_GUIDELINES.md:
- Tombol: SELALU <Button variant="...">, tidak pernah bg-{warna}-600 manual.
  destructive = hapus, success = aksi positif, warning = butuh perhatian,
  outline/secondary = sekunder, ghost = tersier/icon-only (bukan untuk hapus).
- Toast: pakai toastSuccess/toastError/toastWarning/toastInfo dari
  src/lib/utils/toastMessage.ts, jangan toast.success()/toast.error() langsung.
- Badge status: pakai variant sesuai docs/UI_UX_GUIDELINES.md §4, jangan bikin warna baru.
- Loading/empty/error: pakai Skeleton/AdminEmptyState/PublicEmptyState/ErrorWithRetry
  yang sudah ada, jangan bikin state custom baru.
- Radius: rounded-lg (kartu admin), rounded-xl (panel/modal admin),
  rounded-2xl (kartu publik), rounded-3xl (hero/section besar publik).
- Semua elemen interaktif: min 44px tap target, focus-visible:ring (bukan focus:ring).
- Dialog/drawer custom: pakai useDialogA11y, jangan implementasi ESC/focus-trap sendiri.
- Form yang bisa kehilangan banyak input: pasang useFormDirtyGuard.
- Animasi: hanya transform/opacity/filter, tidak di hero/LCP, pakai class di index.css
  (.card-hover-lift, .reveal-scroll, .stagger-reveal-N) sebelum bikin animasi baru.
Setelah selesai, cek ulang terhadap checklist §9 sebelum menganggap task selesai.
```

---

## 11. Penegakan — supaya tidak longgar lagi

Checklist manual gampang terlewat, apalagi kalau halaman ditulis terpisah-pisah dalam waktu berbeda. Tiga lapis penegakan yang disarankan, dari paling murah ke paling kuat:

1. **Regex check di CI** (paling cepat diterapkan, langsung menangkap pelanggaran yang ada sekarang):
   ```bash
   # Gagalkan CI kalau ada warna hardcoded di luar file komponen inti
   grep -rnE "bg-(emerald|amber|rose|red)-[0-9]{3}" src/ \
     --exclude=src/components/ui/button.tsx \
     --exclude=src/components/ui/badge.tsx \
     --exclude=src/index.css \
     && exit 1 || exit 0
   ```
2. **ESLint custom rule** (`eslint-plugin-tailwindcss` punya opsi `no-custom-classname` atau bisa ditulis rule sendiri) untuk menolak string `focus:ring` tanpa `focus-visible:` mendahuluinya, dan menolak `toast.success(`/`toast.error(` langsung dari import `sonner` di luar `toastMessage.ts`.
3. **Prompt template tetap** (§10) dipakai konsisten setiap sesi AI-assisted coding — supaya halaman baru otomatis mengikuti aturan sejak ditulis, bukan diperbaiki belakangan lewat audit berikutnya.

Tanpa lapis penegakan, kemungkinan besar 6 bulan lagi akan ada audit ketiga dengan temuan yang sama persis — karena primitive yang sudah dibuat di audit pertama dan kedua terbukti dari data di §1 tidak otomatis diadopsi ke halaman baru.
