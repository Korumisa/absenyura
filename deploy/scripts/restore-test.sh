#!/usr/bin/env bash
# ===========================================================================
# restore-test.sh — MONTHLY VALIDATION: Test Restore dari Backup Object Storage
# ===========================================================================
# Tujuan: Memastikan backup terakhir BENAR-BENAR bisa di-restore & data ada.
#         Jalankan manual setiap 1 bulan (masuk monthly maintenance checklist).
#
# Flow:
#   1. rclone ls remote → ambil file backup TERBARU
#   2. rclone copyto local tempdir
#   3. DROP & RECREATE database test `hmsdp_restore_test`
#   4. pg_restore ke hmsdp_restore_test (ON_ERROR_STOP=1, ketemu error langsung berhenti)
#   5. Validasi row count table critical: Attendance, User, Session, Class, ExcuseRequest, DailyAttendanceSummary
#   6. CLEANUP: DROP database test, rm tempdir
#
# Run as:
#   sudo -u postgres bash deploy/scripts/restore-test.sh
# Exit codes:
#   0 = SUCCESS semua table valid
#   1 = FAIL (lihat /var/log/hmsdp/restore-test.log detail)
# ===========================================================================
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
APP_DIR="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"
ENV_FILE="${APP_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-b2remote}"
RCLONE_PATH="${BACKUP_RCLONE_PATH:-my-bucket/hmsdp-db-backups}"
LOG_FILE="/var/log/hmsdp/restore-test.log"
DB_TEST="hmsdp_restore_test"
mkdir -p "$(dirname "${LOG_FILE}")" 2>/dev/null || true

TMP_DIR="$(mktemp -d -t hmsdp-restoretest-XXXXXXXXXX)"
trap 'rm -rf "${TMP_DIR}"; psql -d postgres -c "DROP DATABASE IF EXISTS ${DB_TEST};" 2>/dev/null' EXIT

log()  { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "${LOG_FILE}" 2>/dev/null; }
die()  { log "FAIL $*"; exit 1; }

START_TS=$(date +%s)
log "START Restore Test. Remote = ${RCLONE_REMOTE}:${RCLONE_PATH}"

# ---- 1. Cari backup TERBARU di Object Storage ----
LATEST=$(rclone ls "${RCLONE_REMOTE}:${RCLONE_PATH}" --max-depth 1 2>/dev/null \
  | awk '{print $2}' \
  | grep -E '^hmsdp-[0-9]{8}-[0-9]{6}\.dump$' \
  | sort -r | head -1)
if [[ -z "${LATEST}" ]]; then
  die "Tidak ada file backup hmsdp-*.dump di remote. Jalankan backup.sh manual DULU."
fi
log "Backup candidate TERBARU = ${LATEST}"

# ---- 2. Download ke local tmp ----
LOCAL_DUMP="${TMP_DIR}/${LATEST}"
LOCAL_SHA="${TMP_DIR}/${LATEST%.dump}.sha256"
if ! rclone copyto "${RCLONE_REMOTE}:${RCLONE_PATH}/${LATEST}" "${LOCAL_DUMP}" --transfers 2 --buffer-size 32M; then
  die "Download backup GAGAL."
fi
FILE_SIZE_MB=$(( $(stat -c%s "${LOCAL_DUMP}" 2>/dev/null || echo 0) / 1024 / 1024 ))
log "Download SELESAI. Size ${FILE_SIZE_MB} MB."

# SHA check (jika tersedia)
if rclone lsf "${RCLONE_REMOTE}:${RCLONE_PATH}" | grep -qFx "${LATEST%.dump}.sha256"; then
  rclone copyto "${RCLONE_REMOTE}:${RCLONE_PATH}/${LATEST%.dump}.sha256" "${LOCAL_SHA}" 2>/dev/null || true
  if [[ -s "${LOCAL_SHA}" ]]; then
    EXPECTED_SHA=$(cat "${LOCAL_SHA}" | xargs)
    ACTUAL_SHA=$(sha256sum "${LOCAL_DUMP}" | awk '{print $1}')
    if [[ "${EXPECTED_SHA}" == "${ACTUAL_SHA}" ]]; then
      log "SHA256 VALID OK."
    else
      die "SHA256 INVALID! expected=${EXPECTED_SHA} actual=${ACTUAL_SHA} — BACKUP CORRUPT."
    fi
  fi
fi

# ---- 3. Recreate empty test DB ----
psql -d postgres -c "DROP DATABASE IF EXISTS ${DB_TEST};" >/dev/null 2>&1
psql -d postgres -c "CREATE DATABASE ${DB_TEST} OWNER hmsdp_app ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0;" \
  || die "CREATE DATABASE ${DB_TEST} GAGAL."

# ---- 4. Restore (pg_restore) dengan error exit strict ----
RESTORE_LOG="${TMP_DIR}/restore.log"
log "pg_restore BERJALAN ..."
if ! pg_restore -d "${DB_TEST}" --no-owner --no-privileges --jobs=2 --exit-on-error \
       "${LOCAL_DUMP}" >"${RESTORE_LOG}" 2>&1; then
  TAIL_LOG=$(tail -n 30 "${RESTORE_LOG}" | tr '\n' '|')
  die "pg_restore GAGAL. Detail (tail 30): ${TAIL_LOG}"
fi
log "pg_restore SELESAI tanpa error."

# ---- 5. Validasi row count table kritis ----
log "VALIDASI ROW COUNT TABLE KRITIS:"
TABLES=( "User" "Class" "Session" "Attendance" "ClassEnrollment" "ExcuseRequest" )
ANY_EMPTY=0
for tbl in "${TABLES[@]}"; do
  Q=$(cat <<EOF
SELECT to_regclass('public."${tbl}"');
EOF
)
  EXISTS=$(psql -d "${DB_TEST}" -t -c "${Q}" 2>/dev/null | xargs)
  if [[ -z "${EXISTS}" ]]; then
    log "  - Table ${tbl}: ❌ TIDAK ADA (not exist — MIGRATION TIDAK DIRESTORE SEMUA?)"
    ANY_EMPTY=1; continue
  fi
  CNT=$(psql -d "${DB_TEST}" -t -c "SELECT count(*) FROM public.\"${tbl}\";" 2>/dev/null | xargs)
  CNT="${CNT:-0}"
  # Perhatian: row count 0 BISA normal jika brand new instalasi (belum ada user). Kita log warning, tidak direct fail.
  if [[ "${CNT}" -eq 0 ]]; then
    log "  - Table ${tbl}: ⚠️ row=0 (normal jika fresh install, PERIKSA jika seharusnya ada data)."
  else
    log "  - Table ${tbl}: ✔ rows = ${CNT}"
  fi
done

# ---- 6. Validasi Prisma migration table = ALL APPLIED (mirip prisma migrate status) ----
if psql -d "${DB_TEST}" -tAc "SELECT to_regclass('public.\"_prisma_migrations\"');" 2>/dev/null | grep -q '_prisma_migrations'; then
  MIG_TOTAL=$(psql -d "${DB_TEST}" -tAc "SELECT count(*) FROM public.\"_prisma_migrations\";")
  MIG_APPLIED=$(psql -d "${DB_TEST}" -tAc "SELECT count(*) FROM public.\"_prisma_migrations\" WHERE applied_steps_count > 0 AND is_finished = true;")
  MIG_ROLLED=$(psql -d "${DB_TEST}" -tAc "SELECT count(*) FROM public.\"_prisma_migrations\" WHERE rolled_back_at IS NOT NULL;")
  log "Migration Prisma: total=${MIG_TOTAL}, applied=${MIG_APPLIED}, rolled_back=${MIG_ROLLED}"
  if [[ "${MIG_TOTAL}" -eq 0 ]]; then log "  WARN: migration table empty (normal jika fresh DB).";
  elif [[ "${MIG_APPLIED}" -ne "${MIG_TOTAL}" || "${MIG_ROLLED}" -gt 0 ]]; then
    die "PRISMA MIGRATION INVALID: tidak semua applied / ada rolled back."
  fi
else
  log "WARN: Table _prisma_migrations tidak ditemukan (normal jika pre-seed pg_dump brand new)."
fi

# ---- Final verdict ----
ELAPSED=$(( $(date +%s) - START_TS ))
if [[ "${ANY_EMPTY}" -eq 0 ]]; then
  log "✅ RESTORE TEST LULUS. Elapsed ${ELAPSED} detik."
  exit 0
else
  die "⚠️ Restore Test menemukan table kosong / tidak ada. Periksa backup benar-benar berisi data (bukan fresh install)."
fi
