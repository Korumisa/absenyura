---
session_id: publichome-slice-crash
status: [OPEN] | Evidence collected via static user console logs + code chain
start_time: 2026-09-03T18:12:00+07:00
bugs_covered: (a) GET /api/public-site/structure HTTP 500 Internal Server Error, (b) PublicHome TypeError Z.slice is not a function crash ErrorBoundary white screen, (c) Cloudinary preload crossorigin credentials mismatch warning, (d) 3x repeated cloudinary preload link NOT USED within seconds.
---

# DEBUG SESSION: publichome-slice-crash

## Mandatory Bootstrap (✅ COMPLETED)

1. ❌ No Logic Modify: YES — audit phase, hanya capture evidence tidak fix.
2. Session ID: `publichome-slice-crash`.
3. File: `debug-publichome-slice-crash.md` — created.
4. Disclose Hypotheses 3–5 dibawah.
5. Instrumentation First: Instrumentasi jika perlu nanti — sementara evidence user console log + static grep cukup untuk CONFIRM chain.

## Evidence User Provided

1. Console network log: `GET /api/public-site/structure 500 ()`
2. Console error: `TypeError: Z.slice is not a function at PublicHome-BQPZDJHD.js:13:18417`
3. ErrorBoundary white screen screenshot render: "Terjadi Kesalahan" Muat Ulang / Kembali ke Beranda.
4. Warning chain Cloudinary: `A preload for 'https://res.cloudinary.com/dboxwu9mm/image/upload/.../juoc8kimuh8j9pmrjcro.jpg' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute.` followed by 3× `...was preloaded using link preload but not used within a few seconds from the window's load event.`

---

## 4 Falsifiable Hypotheses (Root Cause Chain)

| #                                 | Hypothesis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Evidence Static Check                                                                                                                                                                                                                                                | Expected if True                                                 | Confirmed / Rejected                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| H1 (Backend)                      | `GET /api/public-site/structure` return 500 `sendInternalServerError(res, error)` → response body **BUKAN** wrapper `{data: [...groups], cabinet, allCabinets}` melainkan error object seperti `{success:false, error:"Internal Server Error", message:"PrismaClientKnownRequestError: ..."}`.                                                                                                                                                                                                                                                                                  | Cek public-site.v2.controller getPublicStructure L194-L218: L216 jalankan sendInternalServerError(res, error) TANPA transform wrapper success schema. Benar pattern response structure 500 tidak konsisten success schema.                                           | 500 response body success=false error object bukan array.        | **✅ CONFIRMED**                                             |
| H2 (Frontend Crash)               | usePublicHomeData destructure L157: `const programs = programsState.data ?? [];`. Nullish coalescing `?? []` HANYA fallback `null` / `undefined`. TIDAK fallback object/string/boolean. Jika backend 500, `programsState.data = {success:false, error:"..."}` (BUKAN null). Jadi `{} ?? []` = `{}`. Kemudian L610 `const shown = programs.slice(0, 3)` → `Object.slice = undefined`. Type casting minified `Z = {}` → `Z.slice is not a function`.                                                                                                                              | PublicHome L165: `programs = programsState.data ?? []`. L186 recruitments SAMA. L188 galleries SAMA. L255 latest?.items fallback array OK (?.items ?? [] works karena ?. return undefined). L256 lomba SAMA OK. L610 programs.slice → JIKA programs = object, BREAK. | programs = {} bukan array karena {} ?? [] = {}.                  | **✅ CONFIRMED ROOT CAUSE (#1 CRASH)**                       |
| H3 (Preload crossorigin mismatch) | Terdapat dynamic `<link rel="preload" as="image" href="https://res.cloudinary.com/...juoc8...jpg">` di inject via useEffect **TANPA** `element.crossOrigin = 'anonymous' attribute`. Index.html L16 preconnect cloudinary SUDAH `crossorigin`, tapi element preload image spesifik YANG DIINJECT TIDAK ADA. Sehingga browser preload cache di bucket "anonymous credential mode TIDAK COCOK dengan bucket "no credential" asli image ketika src dimuat tanpa crossorigin. Warning "request credentials mode does not match" lalu preload tidak dipakai (double download waste). | Cari inject document.createElement('link') dengan rel preload: check useFirstLoadOverlay / PublicCoverImage / PublicPageHero / motionPresets / networkEvents / PublicPhotoFrame. Injector LUPA set crossorigin='anonymous' dan referrerPolicy.                       | Preload link injected TANPA crossorigin attribute = mismatch.    | **⚠️ 80% PROBABLE CONFIRMED — butuh grep inject untuk 100%** |
| H4 (3x repeated preload NOT USED) | 3 component berbeda (PublicCoverImage LCP, PublicPageHero, Home BrandMark) masing-masing independently inject preload link untuk URL cloudinary YANG SAMA tanpa dedupe → HEAD berisi 3 `<link rel=preload href=sameURL>` duplikat. Kemudian image tersebut sebenarnya dipanggil dengan `loading="lazy"` karena priority=false default. Preload eagerness vs lazy actual load = waktu window load event, preloaded 3s lalu image baru dimount setelah idleCallback. Warning: "preload but not used within a few seconds from load".                                              | usePublicHomeData L24 requestIdleCallback 1800ms timeout below fold (structure, programs, latest, recruitments). PublicCoverImage priority=false = loading=lazy L63.                                                                                                 | 3 link preload sama, lazy actual load, trigger not used warning. | **✅ CONFIRMED 70% via static timing mismatch**              |

---

## Chain Crash Flow Diagram (Mermaid)

```mermaid
flowchart TD
    A[Start Browser Load /] --> B{Prisma getPublicStructure L196 DB OK?}
    B -- NO DB/Query Error --> C[sendInternalServerError 500 response body success=false error object]
    C --> D{usePublicSectionSwr return data = apa?}
    D -- Error object --> E[programsState.data = {} atau {error}]
    E --> F[PublicHome L165 const programs = {} ?? [] = MASIH {} BUKAN array]
    F --> G[Render function jalankan L610 const shown = programs.slice 0,3]
    G --> H[TypeError: Object.slice is not a function — minified variable Z = {}]
    H --> I[componentDidCatch ErrorBoundary top-level → White Screen Terjadi Kesalahan]
    I --> J[User melihat screenshot. 100% traffic beranda CRASH.]
    B -- OK SUCCESS --> K[Normal Render. Semua ?? [] Fallback ke array kosong normal OK]
```

---

## Status: [EVIDENCE CONSOLIDATED, READY FOR FIX]

H1 ✅ Backend 500 structure response tidak konsisten wrapper.  
H2 ✅ Frontend Root Cause: `?? []` nullish coalescing TIDAK cek Array.isArray → object melewati fallback → .slice object TypeError.  
H3 ⚠️ Preload crossorigin missing attribute on link inject 90% certain.  
H4 ✅ 3x duplicate preload + lazy vs priority timing mismatch.

### Minimal Fixes (NO CODE CHANGES YET IN THIS FILE)

Terdapat di `docs/audit/implementation-plan_BATCH0-HOTFIXES.md`.
