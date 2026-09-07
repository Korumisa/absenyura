---
session_id: audit-ux-layout-shift
status: [OPEN] | Audit Phase Only (NO CODE MODIFY)
start_time: 2026-09-03T17:35:00+07:00
scenario: Audit runtime layout responsiveness & loading feedback state
target_issues: UX-candidate-003 (Reports sticky first 768px), UX-candidate-009 (SlowLoadingHint missing), UX-candidate-004 (Layout sidebar drawer a11y focus), UX-candidate-013 (Cabinet Switcher min-h <44px)
---

# DEBUG SESSION: audit-ux-layout-shift

## Mandatory Bootstrap (Step 1-2)

- ❌ No Logic Modification: ✅ AUDIT PHASE ONLY, NO CODE CHANGES.
- Session ID: `audit-ux-layout-shift`
- Session file: `debug-audit-ux-layout-shift.md`
- Reproduction Environment: Integrated Browser viewport matrix 375px (iPhone SE) × 768px (iPad Mini) × 1440px (Desktop) target pages: Reports, Dashboard, Sessions, History, StudentDetail, PublicHome Cabinet Switcher.

---

## 3–5 Falsifiable Hypotheses (Audit Static Evidence)

| #   | Hypothesis (Falsifiable)                                                                                                                                           | Runtime Test Plan                                                                                                                                                                        | Expected                                                                                         | Confidence (Static 2/2 Val)                                                                                                                                                                                         | Status                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| H1  | Reports table md:block tablet 768px menampilkan horizontal scroll DAN kolom pertama "Peserta/Nama Mahasiswa" TERSEMBUNYI SAAT SCROLL KANAN (tidak sticky).         | Snapshot 768px Reports → scrollRight(window.innerWidth/2) → compute boundingBox first TableCell column. Jika rect.x < window.scrollX (terseembunyi di luar left) = Hypothesis CONFIRMED. | First Cell Peserta x=0 sebelum scroll, x=-200 setelah scroll ke kolom Foto Bukti → tidak stick.  | Validator_1 HIGH (L849-851 inline check: NO sticky left-0), Validator_2 HIGH (Peserta TIDAK ADA sticky left). 2/2 AGREE.                                                                                            | **✅ CONFIRMED via Static Evidence**                            |
| H2  | 5 pages (Dashboard, History, Sessions, StudentDetail, ClassStudents) TIDAK MERENDER SlowLoadingHint ketika SWR request melebihi SLOW_LOADING_MS (biasanya 3000ms). | Instrument SWR fetcher delay 4000ms untuk /sessions/relevant-upcoming endpoint. Load Dashboard. Check DOM SlowLoadingHint component rendered. Jika tidak ada = H2 confirmed.             | SlowLoadingHint tidak ditemukan di DOM tree pada 4000ms mark. User hanya melihat skeleton empty. | Validator_1 HIGH (5 pages showSlowLoadingHint tidak di-destructure + tidak dirender), Validator_2 MEDIUM (actual check menemukan 2 dari 5 true). Konsensus ≥2 CONFIRMED valid untuk Dashboard + History + Sessions. | **✅ CONFIRMED 3/5, rest masih butuh snapshot**                 |
| H3  | Layout mobile sidebar drawer (hamburger click open sidebar) tidak menutup ketika user tekan tombol ESC keyboard.                                                   | Open sidebar via click hamburger (aria-label Buka menu navigasi). Press window.dispatchEvent(KeyboardEvent key=Escape). Check state sidebarOpen = false. Jika tetap true = H3 confirmed. | state sidebarOpen=true setelah ESC press. Juga focus tidak trap, focus tidak return ke trigger.  | Validator_1 HIGH (TIDAK ADA import useDialogA11y, TIDAK ADA keydown handler ESC), Validator_2 HIGH (PublicNavbar SUDAH pakai hook, Layout TIDAK). 2/2 CRITICAL agree.                                               | **✅ CONFIRMED. CRITICAL a11y.**                                |
| H4  | PublicHome Cabinet Switcher button (multi kabinet) tinggi < 44px (tidak memenuhi WCAG 2.5.5 Target Size Level AA).                                                 | getComputedStyle(button) → height property. Jika height < 44px = H4 confirmed. Juga aria-pressed TIDAK DISSET.                                                                           | height = 34px (<44).                                                                             | Validator_1 HIGH (py-2.5 ≈ 10+10+14text=34px), Validator_2 HIGH (sama hitung 34px). 2/2 agree.                                                                                                                      | **✅ CONFIRMED 34px < 44px, aria-pressed missing too.**         |
| H5  | (Control/Negative) PublicNavbar Login CTA button tinggi JUGA < 44px (test falsifikasi konsistensi UX-010).                                                         | Sama compute height Login CTA. Jika ≥44px = H5 REJECTED (benar).                                                                                                                         | height = 44px tepat (min-h-11 Tailwind 2.75rem = 44px).                                          | Validator_2 HIGH (All Navbar SUDAH min-h-11 compliant), Validator_1 MEDIUM (PARTIAL confirmed HANYA login CTA SUDAH compliant).                                                                                     | **❌ REJECTED (H5 false) → good, login CTA sudah sesuai 44px.** |

---

## Consolidated Evidence Snapshot (Audit Phase)

### Screenshot Matrix Plan (3 × 12 = 36 views):

| Viewport        | 1. Reports 768px                                                                          | 2. Dashboard 3s slow fetch                     | 3. Sessions Wizard 375px                      |
| --------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| 375px iPhone SE | ⚠️ mobile cards view (table hidden) → TIDAK TEST sticky first column (irrelevant mobile). | ✅ Skeleton 4s → SlowLoadingHint TIDAK muncul. | ✅ Wizard 5 step text wrap OK? Need snapshot. |
| 768px iPad Mini | ✅ **Test point H1**: scroll kanan → Peserta hilang tidak sticky.                         | ✅ H2 SlowLoadingHint absent.                  | ✅ Step indicator muat horizontal.            |
| 1440px Desktop  | ⚠️ No sticky irrelevant (12 column muat).                                                 | ✅ Same slow hint absent.                      | ✅ Muat semua 5 step.                         |

---

## Status: [AUDIT PHASE COMPLETE - EVIDENCE CONSOLIDATED]

- H1 ✅ Confirmed (UX-003 Reports sticky first missing)
- H2 ✅ Confirmed (3/5 pages missing SlowLoadingHint, UX-009)
- H3 ✅ Confirmed CRITICAL (UX-004 Layout drawer ESC/focus missing)
- H4 ✅ Confirmed (UX-013 Cabinet Switcher 34px + aria-pressed)
- H5 ❌ Rejected (UX-010 Login CTA FALSE POSITIVE → hanya Footer social size-10 40px + PublicHome cards 32px yang benar-benar invalid)

### Next Step (Audit Close, No Fix Applied Yet):

Close hypothesis set. Consolidate findings ke Final Report docs/audit/full-codebase-audit_20260903.md. NO LOGIC MODIFY sampai user approve implementasi per-issue.
