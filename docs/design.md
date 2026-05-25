# Patokan desain AbsensiWeb

Dokumen singkat untuk menjaga konsistensi UI. **Dua halaman berbeda** di bawah ini menjadi referensi utama — jangan mencampur pola publik ke admin (atau sebaliknya) tanpa alasan kuat.

| Permukaan | Route patokan | File utama |
|-----------|---------------|------------|
| **Publik** | `/` (beranda) | [`PublicHome.tsx`](../src/pages/public/PublicHome.tsx), [`PublicLayout.tsx`](../src/components/PublicLayout.tsx) |
| **Admin** | `/classes` | [`Classes.tsx`](../src/pages/Classes.tsx), [`AdminPageShell.tsx`](../src/components/AdminPageShell.tsx), [`ClassCard.tsx`](../src/components/classes/ClassCard.tsx) |
| **Publik (modular)** | `/` section | [`src/components/public/home/`](../src/components/public/home/) — hero, struktur, section CMS |

Token global: [`src/index.css`](../src/index.css), [`tailwind.config.js`](../tailwind.config.js).

---

## Token bersama

| Token | Nilai | Pemakaian |
|-------|--------|-----------|
| Brand | `#2f80ed` (`text-brand`, `bg-brand`) | Aksen utama admin + link publik |
| Font UI | Plus Jakarta Sans (`font-sans`) | Seluruh app |
| Font display | Cormorant Garamond (`font-display`) | Judul hero publik saja |
| Radius kontrol | `rounded-md` (`--radius`) | Input, tombol |
| Radius kartu admin | `rounded-lg` / `rounded-xl` | Panel, kartu kelas |
| Radius kartu publik | `rounded-3xl` | Section & hero publik |
| Semantik | `background`, `foreground`, `muted-foreground`, `border`, `destructive` | shadcn / HSL di `:root` |

---

## 1. Publik — beranda (`/`)

**Karakter:** editorial, lega, gambar besar, sedikit animasi CSS (bukan framer di hero/LCP).

- **Layout:** `PublicLayout` → navbar transparan/ringan, footer, meta OG.
- **Hero:** gambar cover + judul `font-display`; warna aksen bisa dari CMS (`primary_color` di profil).
- **Kartu / section:** `bg-white`, `border-black/10`, bayangan lembut (`shadow-[0_28px_70px_-50px_...]`), sudut **`rounded-3xl`**.
- **Teks:** judul kuat, subjudul `text-muted-foreground` / slate; CTA `ArrowRight`, link biru.
- **Konten bawah fold:** `PublicReveal` / `PublicEnter` (opacity + translateY); horizontal rail untuk program/divisi.
- **Kosong / error:** `PublicEmptyState`, `PublicPageError` — gaya sama, bahasa Indonesia.

**Jangan di admin:** `rounded-3xl` massal, `font-display`, bayangan dramatis custom.

---

## 2. Admin — kelas (`/classes`)

**Karakter:** padat, operasional, sidebar + area kerja, biru HMSDP sebagai aksen fungsi.

- **Layout:** `Layout` sidebar + `AdminPageShell` `variant="plain"` (judul `text-2xl font-bold`, deskripsi `text-sm text-muted-foreground`).
- **Panel utama:** satu **`rounded-xl border border-border bg-card shadow-card`**; toolbar `border-b`, filter/search `w-full`.
- **Grid kartu:** `sm:grid-cols-2 xl:grid-cols-3`, `items-stretch`; kartu [`ClassCard`](../src/components/classes/ClassCard.tsx):
  - strip atas `h-1 bg-brand`
  - `rounded-lg`, `hover:border-brand/40`
  - seluruh kartu klik; aksi edit/hapus `size="icon"` terpisah (`stopPropagation`)
- **Form / modal:** `Dialog` + `ConfirmModal`; tombol utama `Button` default; hapus `variant` danger / `ConfirmModal variant="danger"`.
- **Loading:** `Skeleton`, `ActionLoadingOverlay`, `AdminEmptyState`, `ErrorWithRetry`.
- **Tap target:** tombol shell `min-h-11` di breakpoint kecil (lihat `AdminPageShell`).

**Jangan di publik:** panel toolbar admin, grid kartu kelas, sidebar token `--sidebar-bg`.

---

## Checklist cepat (fitur baru)

1. Tentukan permukaan: **publik** atau **admin**?
2. Salin radius + bayangan dari patokan halaman di atas.
3. Warna: pakai token (`brand`, `muted-foreground`), hindari hex acak kecuali CMS publik.
4. Status kehadiran / badge: ikon + label, jangan hanya warna ([`attendanceStatusLabel`](../src/lib/reportLabel.ts) / chart theme).
5. Komponen dasar: [`src/components/ui/`](../src/components/ui/) (Button, Input, Dialog, Select).

---

*Terakhir diselaraskan dengan codebase; jika token di `index.css` berubah, perbarui tabel di atas.*
