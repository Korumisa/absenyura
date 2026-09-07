# Debug Session: subpage-polymorphic-find

Status: [OPEN]
Bug: `TypeError: a.find is not a function` replicasi ke SETIAP sub-halaman landing (OpenRecruitment, Berita, Galeri, dst) ketika `api/public-site/structure:1` mengembalikan HTTP 500.
Screenshot prod: hmsdp.me/open-recruitment. Same crash pada 8 sub-halaman.

## 5 Falsifiable Hypotheses

1. **[ROOT-CANDIDATE] Central `PublicSiteDataContext` fetcher TIDAK throw explicit ketika `r.data.success === false` — akibatnya error payload object `{success:false, error:...}` lolos sebagai "data", lalu setiap per-page component memanggil `.find()` / `.map()` / `.slice()` pada object instead of array → TypeError.** Evidence: PublicSiteDataContext.tsx wrapped di setiap landing page via PublicLayout. `/structure` returning 500 (table missing) → controller catch not injecting `{data:[], cabinet:null, allCabinets:[]}` → returns error object shape → lazy `?? []` doesn't catch object shape → crash every page.
2. **Backend `GET /public-site/structure` controller catch block TIDAK inject default empty shape sama seperti controller profile/posts Task A.** Confirm: Task A spec point 3 injection hanya di `getPublicStructure` catch — periksa apakah end-point `/public-site/structure` benar-benar route ke getPublicStructure, atau route lain yang tidak dilindungi catch shape injection.
3. **Per-page fetcher (non-shared) di OpenRecruitment, Berita, dll masih pakai `?? []` fallback untuk array access sites `.find()/.slice()/.map()` — tidak type-narrow `Array.isArray()`.** Bukti chunk error OpenRecruitment-D-_.js line 1199 memanggil `.find()` — source di file pages/public/_.tsx.
4. **Controller `getPublicStructure` 500 bukan karena migration table missing, tapi karena data profile sparse menyebabkan undefined reference di structure query.** Test: coba jalankan endpoint manual ketika profile ada tapi structure table missing.
5. **Cache LRU public-site cache middleware store error object shape sebagai data normal tanpa distinguishing error → cache hit serve error object ke subsequent page load selama 1 menit → replicasi semua pages 100% crash bukan hanya 1x.**

## Evidence Logs (to collect after instrumentation)

- Pre-fix runtime logs (after instrumentation): every sub-page visit
- Backend controller return shape log: structure endpoint catch
- Fetcher response type log: PublicSiteDataContext
- Page call site log: `.find()` invokee array check pre-call

## Checklist

- [ ] Step1: Instrumentation deployed (Debug Server + 3 debug-points + log viewer)
- [ ] Step2: Reproduce nav ke 8 sub-pages, capture 40+ log events → hypotheses confirm/reject
- [ ] Step3: Minimal fix patch
- [ ] Step4: Post-fix logs comparison
- [ ] Step5: User confirmation A/B/C/D
- [ ] Step6: Cleanup instrumentation & debug server
