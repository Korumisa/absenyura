#!/usr/bin/env bash
# ==========================================================================
# vps-backup.sh — PostgreSQL Full Backup + Rclone Upload ke Object Storage
# ==========================================================================
# Dua mode target database:
#   - Supabase (VPS app + Supabase DB): set BACKUP_DATABASE_URL di .env, jalankan sebagai user deploy.
#     Hanya schema `public` (semua tabel Prisma) yang di-dump.
#   - Postgres lokal (1 VPS penuh): kosongkan BACKUP_DATABASE_URL, jalankan sebagai user `postgres`.
#
# Usage Manual (test first):
#   bash /var/www/hmsdp/repo/scripts/vps-backup.sh manual                 # mode Supabase
#   sudo -u postgres bash /var/www/hmsdp/repo/scripts/vps-backup.sh manual # mode lokal
# Usage Cron (setiap 6 jam): lihat deploy/hybrid-500user/09_CRONJOBS_SETUP.md
#
# Env (dibaca dari .env repo; hanya key di bawah yang dibaca):
#   BACKUP_DATABASE_URL   (mode Supabase) — Session pooler port 5432, contoh:
#                         postgresql://postgres.<ref>:<pwd>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
#   DB_NAME               (mode lokal, default: hmsdp)
#   BACKUP_RCLONE_REMOTE  (default: b2remote)
#   BACKUP_RCLONE_PATH    (default: my-bucket/hmsdp-db-backups)
#   BACKUP_RETAIN_DAYS    (default: 30)
#   BACKUP_LOG_FILE       (default: /var/log/hmsdp/backup.log)
#   ALERT_WEBHOOK_URL     (opsional) — slack-compatible webhook POST JSON {"text": "..."}
# ==========================================================================
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
APP_DIR="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"
ENV_FILE="${APP_DIR}/.env"

MODE="${1:-cron}"
MANUAL=0
if [[ "${MODE}" == "manual" ]]; then MANUAL=1; fi

# -------- Load environment variables dari .env production --------
# Tidak `source` seluruh .env: nilai URL tanpa kutip berisi '&' akan dieksekusi bash.
env_get() {
  local key="$1" line value
  line=$(grep -E "^[[:space:]]*${key}=" "${ENV_FILE}" 2>/dev/null | tail -n 1) || return 0
  value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "${value}"
}
if [[ -f "${ENV_FILE}" ]]; then
  for key in BACKUP_DATABASE_URL DB_NAME BACKUP_RCLONE_REMOTE BACKUP_RCLONE_PATH \
             BACKUP_RETAIN_DAYS BACKUP_LOG_FILE ALERT_WEBHOOK_URL; do
    if [[ -z "${!key:-}" ]]; then
      value="$(env_get "${key}")"
      if [[ -n "${value}" ]]; then export "${key}=${value}"; fi
    fi
  done
else
  echo "[WARN] File .env tidak ada di ${ENV_FILE}; pakai defaults."
fi
RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-b2remote}"
RCLONE_PATH="${BACKUP_RCLONE_PATH:-my-bucket/hmsdp-db-backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
LOG_FILE="${BACKUP_LOG_FILE:-/var/log/hmsdp/backup.log}"
DB_NAME="${DB_NAME:-hmsdp}"
if [[ -n "${BACKUP_DATABASE_URL:-}" ]]; then
  DB_TARGET="${BACKUP_DATABASE_URL}"
  DB_LABEL="supabase"
  DUMP_SCOPE=(--schema=public --no-owner --no-privileges)
else
  DB_TARGET="${DB_NAME}"
  DB_LABEL="${DB_NAME}"
  DUMP_SCOPE=()
fi

# -------- Utility --------
TS_UTC="$(date -u +%Y%m%d-%H%M%S)"
TMP_DIR="$(mktemp -d -t hmsdp-backup-XXXXXXXXXX || true)"
trap 'rm -rf "${TMP_DIR}"' EXIT

mkdir -p "$(dirname "${LOG_FILE}")" 2>/dev/null || true

log()  { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "${LOG_FILE}" 2>/dev/null; }
die()  { log "FATAL: $*"; post_webhook "🚨 DB Backup GAGAL @ ${TS_UTC} — $*" 1; exit 1; }

post_webhook() {
  local msg="$1"
  local level="${2:-0}"  # 0 info / 1 fail
  if [[ -z "${ALERT_WEBHOOK_URL:-}" ]]; then return 0; fi
  local color="good"
  if [[ "${level}" -eq 1 ]]; then color="danger"; fi
  local payload
  payload=$(printf '{"text":"%s","attachments":[{"color":"%s","title":"HMSDP VPS Backup","text":"Mode %s","fields":[{"title":"Timestamp (UTC)","value":"%s","short":true},{"title":"DB","value":"%s","short":true}]}]}' \
    "${msg}" "${color}" "${MODE}" "${TS_UTC}" "${DB_LABEL}")
  curl -sS --max-time 15 -X POST -H 'Content-Type: application/json' \
    -d "${payload}" "${ALERT_WEBHOOK_URL}" >/dev/null 2>&1 || true
}

# -------- 1. Check environment --------
if ! command -v pg_dump >/dev/null 2>&1; then
  die "pg_dump tidak ditemukan (postgres-client tidak install? apt install postgresql-client)"
fi
if ! command -v rclone >/dev/null 2>&1; then
  die "rclone tidak ditemukan. Install: curl https://rclone.org/install.sh | sudo bash"
fi
if ! psql -d "${DB_TARGET}" -c 'SELECT 1;' >/dev/null 2>&1; then
  die "Tidak bisa konek ke DB ${DB_LABEL}. Mode Supabase: cek BACKUP_DATABASE_URL (session pooler :5432, sslmode=require). Mode lokal: cek pg_hba.conf / user postgres."
fi
SERVER_MAJOR=$(psql -d "${DB_TARGET}" -t -c 'SHOW server_version_num;' 2>/dev/null | xargs)
SERVER_MAJOR=$(( ${SERVER_MAJOR:-0} / 10000 ))
CLIENT_MAJOR=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
if [[ "${SERVER_MAJOR}" -gt 0 && "${CLIENT_MAJOR:-0}" -lt "${SERVER_MAJOR}" ]]; then
  die "pg_dump v${CLIENT_MAJOR} lebih lama dari server v${SERVER_MAJOR}. Install postgresql-client-${SERVER_MAJOR} (repo apt.postgresql.org)."
fi

# -------- 2. Sanity check size --------
DB_SIZE_MB=$(psql -d "${DB_TARGET}" -t -c "SELECT (pg_database_size(current_database()) / 1024 / 1024)::bigint;" 2>/dev/null | xargs)
if [[ -z "${DB_SIZE_MB}" ]]; then DB_SIZE_MB=0; fi
log "START backup — DB size = ${DB_SIZE_MB} MB, temp dir = ${TMP_DIR}"

# -------- 3. Dump custom format (parallel gzip -Fc) --------
OUT_FILE="${TMP_DIR}/hmsdp-${TS_UTC}.dump"
LOG_PG="${TMP_DIR}/pg-dump.log"
if ! pg_dump -Fc -d "${DB_TARGET}" "${DUMP_SCOPE[@]}" -Z 9 --file="${OUT_FILE}" --verbose 2>"${LOG_PG}"; then
  TAIL_LOG=$(tail -n 30 "${LOG_PG}" 2>/dev/null | tr '\n' ' ')
  die "pg_dump gagal — error tail: ${TAIL_LOG}"
fi

FILE_SIZE_BYTES=$(stat -c%s "${OUT_FILE}" 2>/dev/null || echo 0)
FILE_SIZE_MB=$(( FILE_SIZE_BYTES / 1024 / 1024 ))
log "pg_dump SELESAI — compressed size = ${FILE_SIZE_MB} MB (uncompressed DB ${DB_SIZE_MB} MB)"

# -------- 4. Sha256 checksum untuk integritas restore --------
SHA_FILE="${OUT_FILE}.sha256"
sha256sum "${OUT_FILE}" | awk '{print $1}' > "${SHA_FILE}"
log "SHA256 = $(cat "${SHA_FILE}")"

# -------- 5. Upload ke object storage via rclone --------
REMOTE_TARGET="${RCLONE_REMOTE}:${RCLONE_PATH}"
log "Upload — rclone copyto ${OUT_FILE} -> ${REMOTE_TARGET}/$(basename "${OUT_FILE}")"

if ! rclone copyto "${OUT_FILE}" "${REMOTE_TARGET}/$(basename "${OUT_FILE}")" \
    --stats-one-line --transfers 1 --buffer-size 16M; then
  die "rclone upload GAGAL ke ${REMOTE_TARGET}. Periksa: (a) rclone config show ${RCLONE_REMOTE} ada, (b) bucket I/O key write."
fi
if ! rclone copyto "${SHA_FILE}" "${REMOTE_TARGET}/$(basename "${SHA_FILE}")" --transfers 1; then
  die "rclone upload SHA CHECKSUM GAGAL."
fi

log "Upload BERHASIL."

# -------- 6. Retention: hapus file backup > RETAIN_DAYS hari di remote --------
log "Prune remote backup > ${RETAIN_DAYS} hari"
if ! rclone delete "${REMOTE_TARGET}" --min-age "${RETAIN_DAYS}d" --rmdirs --drive-use-trash=false; then
  log "WARN: rclone prune retention gagal (non critical, tidak abort)."
fi

# -------- 7. Validation — cek file ada di remote & SHA256 cocok --------
REMOTE_DUMP="${REMOTE_TARGET}/$(basename "${OUT_FILE}")"
REMOTE_SHA="${REMOTE_TARGET}/$(basename "${SHA_FILE}")"
REMOTE_SIZE=$(rclone size "${REMOTE_DUMP}" 2>/dev/null | awk '/Total objects size/ {gsub(/[()]/,""); print $5}' | head -1 | tr -d '[:alpha:]')
if [[ -z "${REMOTE_SIZE}" || "${REMOTE_SIZE}" -lt 10240 ]]; then
  die "VALIDASI GAGAL: file backup remote size terlalu kecil (${REMOTE_SIZE:-?} bytes). Kemungkinan upload corrupt / partial."
fi

REMOTE_SHA_CONTENT=$(rclone cat "${REMOTE_SHA}" 2>/dev/null | xargs)
LOCAL_SHA_CONTENT=$(cat "${SHA_FILE}" | xargs)
if [[ "${REMOTE_SHA_CONTENT}" != "${LOCAL_SHA_CONTENT}" ]]; then
  die "VALIDASI INTEGRITAS GAGAL: SHA256 tidak match. local=${LOCAL_SHA_CONTENT}, remote=${REMOTE_SHA_CONTENT}."
fi
log "Validasi SHA256 OK. Size uploaded = ${FILE_SIZE_MB} MB"

# -------- 8. Final success --------
DURATION_SEC=$(( $(date +%s) - $(date -u -d "${TS_UTC:0:8} ${TS_UTC:9:2}:${TS_UTC:11:2}:${TS_UTC:13:2}" +%s 2>/dev/null || echo 0) ))
SUMMARY="✅ DB Backup BERHASIL ${TS_UTC} - size=${FILE_SIZE_MB}MB, retensi=${RETAIN_DAYS}d, target=${RCLONE_REMOTE}:${RCLONE_PATH}"
log "${SUMMARY}"
post_webhook "${SUMMARY}" 0
exit 0
