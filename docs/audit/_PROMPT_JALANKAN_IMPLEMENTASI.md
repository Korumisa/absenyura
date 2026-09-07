# =====================================================================

# PROMPT TEMPLATE: JALANKAN IMPLEMENTASI BATCH X (COPY PAKE KE CHAT)

# =====================================================================

# Cara pakai:

# 1. Ganti placeholder [BATCH_ID] dengan nama batch: BATCH0 / BATCH1-P1-SYSTEMIC / dst.

# 2. Ganti [PLAN_FILE_PATH] ke file plan markdown yang sesuai (absolute path).

# 3. Copy SELURUH blok prompt dibawah ini (antara MARKER BEGIN SAMPAI MARKER END)

# paste ke chat TRAE, tekan enter.

# 4. Agent akan menjalankan: Baseline Capture → Task A→B→C urutan →

# Per-task mini-verification → Final Full Verification Suite.

# =====================================================================

# ---------------------- BEGIN COPY PROMPT -----------------------------------

/Gunakan Skill: TRAE-plan-mode + Jika ada runtime bukti butuh: TRAE-debugger

# 🎯 GOAL UTAMA: JALANKAN IMPLEMENTASI [BATCH_ID] FULLY VERIFIED

Plan file approved: [PLAN_FILE_PATH]
Working directory: c:\Users\shink\Pictures\absenyura
Prinsip: NO BREAKING CHANGE. Satu task selesai → mini verification dulu sebelum task berikutnya.
Constraint: Jangan menghapus / me-rename file yang masih dipakai tanpa backward compat wrapper.

# 🚨 MANDATORY EKSEKUSI ORDER (TIDAK BOLEH DILEWATI):

Phase 0 (Baseline Capture):

1. Jalankan `npx tsc --noEmit` → capture error count baseline (harus 0).
2. Jalankan `npx vitest run` → capture count Tests N passed (baseline 62/62).
3. Jalankan `npm run build` → capture durasi (baseline 20s, <25s).

Phase 1 — Task A (Urutan TEPAT SESUAI PLAN):

1. Implement fix TASK A persis spec: line ranges, exact code pattern, backward compat.
2. Buat / update unit test file untuk TASK A (wajib 1+ test case).
3. Mini Verify A: `npx vitest run tests/baru.test.ts src/pages/...` → lulus.
4. Mini Verify A Lint: `npx eslint . --ext .ts,.tsx --cache` → 0 errors.

Phase 2 — Task B (Repeat mini verify pattern):

1. Implement fix TASK B persis spec.
2. Tambah integration test.
3. Mini Verify B: lulus test case yang baru dibuat.
4. Mini Verify B Lint: 0 errors.

... (Ulang Phase pattern untuk TASK C, D, E, ... semua task di plan)

Phase FINAL (FULL VERIFICATION — 4/4 LULUS WAJIB):
Jalankan BERURUT 4 perintah, pastikan exit 0 SEMUA:

1. `npx tsc --noEmit` → EXPECT 0 errors.
2. `npx eslint . --ext .ts,.tsx` → EXPECT 0 errors. Warnings ≤ 450 OK.
3. `npx vitest run` → EXPECT tests 100% hijau (lebih banyak dari baseline karena test baru bertambah).
4. `npm run build` → EXPECT durasi < 25s. Main bundle gz ≤ 210KB.

Phase AKHIR — SUMMARY REPORT (10 LINE FORMAT):
Setelah 4/4 lulus, kembalikan report format:
✅ BATCH [BATCH_ID] COMPLETE.
Summary:

- Modified [N] files, Added [M] test files, Total lines changed +X / -Y.
- tsc: 0 errors.
- eslint: 0 errors, [W] warnings (baseline 399).
- vitest: [A]/[B] suites, [C]/[D] tests passed.
- build: [S] seconds, main bundle [KB] KB gz.
- Top 3 critical bugs fixed: (1)... (2)... (3)...
- No regressions detected.

Jika ada YANG TIDAK LULUS dari 4 final verification:
❌ JANGAN lanjut. Hentikan. Laporkan ke user exact error message, failed test name.
Kemudian ajukan 2 opsi perbaikan: Rollback change yang fail ATAU fix code + tambah guard condition.

# 🧹 CLEANUP AFTER USER CONFIRM:

Setelah user KETIK "verified OK" → cleanup artifact:

1. Hapus 3+ file debug-\*.md di project root (semua status OPEN → confirmed fixed).
2. Commit message format: `feat(audit-BATCH[ID]): Hotfix [N] bugs + [M] tests` (HANYA JIKA user minta commit). JANGAN auto-commit tanpa instruksi.

# ================= END PROMPT TEMPLATE ======================================

```

Contoh PENGGUNAAN NYATA untuk BATCH 0 yang baru saja dibuat:
Copy paste prompt diatas, ganti:
[BATCH_ID] = BATCH0-HOTFIX
[PLAN_FILE_PATH] = c:\Users\shink\Pictures\absenyura\docs\audit\implementation-plan_BATCH0-HOTFIXES.md

Contoh prompt yang SUDAH diisi (siap pakai):
=======================================================================
/Gunakan Skill: TRAE-plan-mode + TRAE-debugger

# 🎯 GOAL UTAMA: JALANKAN IMPLEMENTASI BATCH0-HOTFIX FULLY VERIFIED
Plan file approved: c:\Users\shink\Pictures\absenyura\docs\audit\implementation-plan_BATCH0-HOTFIXES.md
Working directory: c:\Users\shink\Pictures\absenyura
... (SISA SAMA DENGAN TEMPLATE DI ATAS)
=======================================================================
```

## Daftar Plan File yang Sudah Ada:

| Batch                                                                                                                                     | File Plan Absolute Path                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **BATCH 0 HOTFIX P0 CRITICAL** (PublicHome crash + 4 Audit P0)                                                                            | `c:\Users\shink\Pictures\absenyura\docs\audit\implementation-plan_BATCH0-HOTFIXES.md` ← SIAP PAKAI SEKARANG |
| BATCH 1 P1 SYSTEMIC (Audit Report 10+ P1 systemic: badge color, useSwrPageState adoption, prisma select systemic)                         | _Belum dibuat. Buat setelah BATCH0 verified jika user approve._                                             |
| BATCH 2 P2 ONE-OFF (Audit Report 27 one-off: Reports sticky first, Cabinet Switcher aria-pressed, PublicEmptyState Dashboard consistency) | _Belum dibuat._                                                                                             |
| BATCH 3 P3-P4 TECH DEBT + Quick Wins (Top 20 Quick Wins Appendix C ≤30min each)                                                           | _Belum dibuat._                                                                                             |

---

## Quick Reference: Plan Execution Order Disarankan:

1. ✅ SEKARANG: Approve BATCH 0 → jalankan prompt template BATCH0 (fix PublicHome CRASH + 4 P0 Audit).
2. Setelah BATCH0 verified → generate BATCH1 P1 systemic file plan.
3. Setelah BATCH1 → BATCH2 P2 one-off 27 bugs.
4. Akhir: BATCH3 P3-P4 quick wins 20 bugs.
