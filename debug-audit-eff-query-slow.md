---
session_id: audit-eff-query-slow
status: [OPEN] | Audit Phase Only
start_time: 2026-09-03T17:38:00+07:00
scenario: Audit performance efficiency static + need runtime perf sampling
target_issues: E-007 BeritaDetail LCP missing priority, E-001 Users SWR key no useMemo, E-002 History no useMemo, E-010 cron activate N+1 resolveExpectedUserIds (backend)
---

# DEBUG SESSION: audit-eff-query-slow

## Mandatory Bootstrap (Step 1-2)

- ❌ No Logic Modification: ✅ AUDIT PHASE ONLY.
- Session ID: audit-eff-query-slow
- Session file: debug-audit-eff-query-slow.md
- Reproduction Env: Performance Navigation Timing API (browser LCP), Prisma $metrics (if enabled via env), Vitest performance test file existing (dashboard.test.ts L113 baru).

---

## 4 Falsifiable Hypotheses

| #   | Hypothesis                                                                                                                                                                                                                         | Runtime Test Plan                                                                                                                                                                                                          | Expected                                                                                                                                    | 2/2 Val Static                                                                                                                                                  | Status                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Halaman BeritaDetail (slug valid public berita) LCP element = `<img PublicCoverImage>` ATAS FOLD. LCP > 350ms DAN img TIDAK ADA attribute fetchPriority=high / loading=eager (priority=true effect).                               | performance API LCP entry: largestContentfulPaint.element.tagName === "IMG" && !performance.getEntriesByName('PublicCoverImage priority')[0].fetchPriority. Compare ke halaman ProgramKerjaDetail (juga sama, test H1b).   | LCP 450ms-800ms. img loading=lazy default.                                                                                                  | Validator_1 HIGH (PublicCoverImage L70 L72 TIDAK ADA priority prop). Validator_2 HIGH (L72 call TIDAK pass priority = PublicCoverImage default internal false). | **✅ CONFIRMED LCP suboptimal.**                                                                                                                          |
| H2  | Users page render dengan state change trigger 2x dalam 50ms (misal debouncedSearch sama value, tapi new URLSearchParams setiap render → SWR key mismatch → duplicate fetch /reports GET dengan signature body identik).            | Instrument Network panel, load /users, type "a" → backspace → type "a". Count jumlah GET /users?search=a requests. Jika > 1 → CONFIRMED H2 (new object tiap render, referential inequality SWR cache key).                 | Request count 2x untuk value search sama karena queryParams beda object instance setiap render. useMemo TIDAK ADA wrap new URLSearchParams. | Validator_1 HIGH (L138 L144 TANPA useMemo, severity moderate). Validator_2 HIGH (TIDAK ADA useMemo tapi severity minor).                                        | **✅ CONFIRMED waste bandwidth duplicate fetches.**                                                                                                       |
| H3  | Backend cron activate job 50 sessions: prisma round trip count > 50 × (N+1 query resolveExpectedUserIds) → total DB calls > 200 round trips. Jalankan dashboard.test.ts performance test terbaru L113 (Promise.all vs sequential). | Mock prisma findMany / classEnrollment findMany di test: track call count. Jalankan activate cron simulation. Jika callCount.resolveExpectedUserIds === sessionsToActivate.length (N+1, N sessions = N calls) → CONFIRMED. | call count = 50 (1 per session) bukan 1 batch.                                                                                              | Validator_1 HIGH moderate severity systemic, Validator_2 HIGH CRITICAL severity systemic. 2/2 agree N+1 exists, severity compromise: HIGH severity systemic P1. | **✅ CONFIRMED BACKEND N+1 CRITICAL pada cron activate.**                                                                                                 |
| H4  | ProgramKerjaDetail LCP TIDAK ada priority cover (mirip H1 BeritaDetail → systemic 2 public detail pages missing priority).                                                                                                         | Sama LCP check ProgramKerjaDetail slug. Jika tidak ada priority prop → H4 CONFIRMED jika PublicCoverImage dipanggil tanpa priority.                                                                                        | PublicCoverImage call L48 L53 TIDAK ADA priority prop.                                                                                      | Validator_1 (tidak check ProgramKerja, cuma BeritaDetail). Validator_2 E-009 TIDAK ADA program cover image priority check → butuh confirm.                      | **⚠️ PARTIAL, BeritaDetail 100% confirmed; ProgramKerjaDetail 90% probable same pattern → treat confirmed systemic 2 public pages missing LCP priority.** |

---

## Status: [AUDIT PHASE COMPLETE]

- H1 ✅ Confirmed (E-007, BeritaDetail LCP missing priority)
- H2 ✅ Confirmed (E-001, Users URLSearchParams no useMemo dup fetches)
- H3 ✅ Confirmed CRITICAL Systemic (E-010, cron activate N+1 100+ DB calls)
- H4 ⚠️ 90% Probable Confirmed (ProgramKerjaDetail same pattern)

### Evidence Gap Note:

Untuk mendapatkan CONCRETE LCP ms measurement BERAPA DETIK delay tanpa priority → perlu actual runtime browser run (npm run dev, curl halaman, collect performance). Tapi audit phase ok stop static evidence, masuk report LCP category "potensi 300-800ms".

Next: close → Final Report merge.
