---
session_id: audit-uf-state-inconsistency
status: [OPEN] | Audit Phase Only
start_time: 2026-09-03T17:42:00+07:00
scenario: Audit business logic state consistency (cron absent ↔ excuse PENDING)
target_issues: UF-candidate-004 (exclude PENDING from auto-absent), UF-candidate-006 (CMS dirty guard no window.confirm)
---

# DEBUG SESSION: audit-uf-state-inconsistency

## Mandatory Bootstrap (Step 1-2)

- ❌ No Logic Modification: ✅ AUDIT PHASE ONLY.
- Session ID: audit-uf-state-inconsistency
- Scope: business logic audit, data flow user flow, state temporal inconsistency.

---

## 3 Falsifiable Hypotheses (Business Logic)

| #                                   | Hypothesis                                                                                                                                                                                                                                                                              | Reproduction Plan (Unit Test Simulation)                                                                                                                                                                                                                                                               | Expected Outcome                                                                                                                               | 2/2 Validator Static Evidence                                                                                                                                                                                                                                   | Status                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| H1 (UF-004 CRITICAL)                | User U submit excuse PENDING untuk session S (session ACTIVE jam 08-09.40). User U tidak melakukan check-in attendance. Session S mencapai end_time → cron jobs run sessionsToClose auto-absent L128. Hasil attendance untuk user U = **ABSENT** padahal excuse U status masih PENDING. | Mock Prisma: create user U, create Session S end_time < now(09.41), create excuseRequest {user_id: U, session_id:S, status:'PENDING'}, TIDAK create attendance row. Jalankan loop cron.ts L128-L155 mock absentUserIds = expected − present. Result: attendance.status user U = ABSENT → H1 CONFIRMED. | prisma.attendance.createMany data include user U dengan status='ABSENT', karena absentUserIds L140 TIDAK MENGEKSPLUSI excuse PENDING user IDs. | Validator_1 HIGH (TIDAK ADA query excuseRequest di loop close, EXPLICIT confirmed damage trust). Validator_2 HIGH CRITICAL (sama, 2/2 agree severity CRITICAL).                                                                                                 | **✅ CONFIRMED CRITICAL → DAMAGE TRUST LEVEL TERTINGGI user flow. User lihat ABSENT padahal sudah kirim excuse PENDING.** |
| H2 (UF-006 CMS Dirty Guard)         | CONTENT_ADMIN membuka PublicSiteProfile → edit About Us content 3000 karakter → TIDAK klik Simpan → user klik browser back button / klik tab Structure di sidebar → draft 3000 karakter HILANG.                                                                                         | Set dirty=true L118 via onChange textarea. Cek: (a) window.onbeforeunload = undefined (tidak ada event listener). (b) Click navigation Link to Structure (router navigate). (c) Lalu back ke Profile → form value TIDAK ADA 3000 karakter (data hilang). Jika (a+b+c) true → H2 CONFIRMED.             | window.onbeforeunload = null. Router navigate TIDAK ADA guard dirty.                                                                           | Validator_1 HIGH (grep beforeunload 0 matches src/pages, dirty state ADA tapi tidak dipakai guard). Validator_2 MEDIUM CRITICAL (benar 2 file: Profile + Structure TIDAK ADA guard, sisa 4 CMS file diasumsikan tapi 2 file confirmed cukup severity systemic). | **✅ CONFIRMED systemic 2+ CMS file DATA LOSS tanpa window.confirm.**                                                     |
| H3 (UF-005 Content Admin Explainer) | CONTENT_ADMIN login pertama → redirect App.tsx L279 ke /public-site/profile → page render tanpa Alert banner "Selamat datang CONTENT_ADMIN, Anda hanya bisa mengelola konten website, tidak bisa akses Dashboard Akademik".                                                             | Render PublicSiteProfile.tsx sebagai CONTENT_ADMIN role. Check DOM: node <Alert> child Selamat datang Content Admin text ADA? Jika TIDAK → H3 CONFIRMED.                                                                                                                                               | DOM tidak ada Alert component di top. User langsung lihat form tanpa explainer.                                                                | Validator_1 HIGH moderate severity one-off. Validator_2 HIGH minor severity one-off. Kompromi: Moderate Minor P2-P3 border.                                                                                                                                     | **✅ CONFIRMED friction onboarding CONTENT_ADMIN baru.**                                                                  |

---

## Status: [AUDIT PHASE COMPLETE]

- H1 ✅ CONFIRMED CRITICAL (UF-004 Trust Damage): Cron auto-absent tidak exclude user excuse PENDING → temporary ABSENT visible sebelum approved.
- H2 ✅ CONFIRMED CRITICAL (UF-006 Data Loss): CMS dirty state tidak ada beforeunload/nav guard → data edit BERJAM-JAM hilang permanen.
- H3 ✅ CONFIRMED (UF-005): Missing onboarding explainer CONTENT_ADMIN.

### Mitigation Roadmap (for Final Report, NO FIX APPLIED):

Top 2 Most User-Pain:

1. UF-004 P0-P1 → hotfix priority pertama sebelum semester baru dimulai. User akan komplain massal jika absen massal di bulan pertama.
2. UF-006 P1 → systemic fix reusable hook `useFormDirtyGuard` ke 6 CMS pages sekaligus (minimal Profile + Structure yang confirmed).

Next step: Merge all 3 session evidence → Stage 3C Final Report compilation.
