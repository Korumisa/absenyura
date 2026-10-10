#!/usr/bin/env bash
# =============================================================================
# vps-preflight.sh — Pra-Deployment Hardware + OS Compatibility Checker
# -----------------------------------------------------------------------------
# Dijalankan SEGERA setelah order VPS Hostinger KVM2 fresh install Ubuntu 22.04.
# User: root (butuh akses perintah hardware / proc / kernel).
#
# Usage (root):
#   bash scripts/vps-preflight.sh
#   bash scripts/vps-preflight.sh --json      # output JSON untuk CI/CD
#   SKIP_RAM=1 bash scripts/vps-preflight.sh  # matikan check RAM (untuk dev)
#
# Exit codes:
#   0  = Semua critical check PASS
#   1  = Setidaknya 1 CRITICAL check FAIL (harus fix sebelum deploy)
# =============================================================================
set -uo pipefail

# --- Colors ---
C_RESET='\033[0m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[1;33m'
C_BOLD='\033[1m'
PASS="${C_GREEN}[PASS]${C_RESET}"
FAIL="${C_RED}[FAIL]${C_RESET}"
WARN="${C_YELLOW}[WARN]${C_RESET}"
INFO="${C_BOLD}[INFO]${C_RESET}"

JSON_MODE=0
if [[ "${1:-}" == "--json" ]]; then JSON_MODE=1; fi

# --- Counters ---
TOTAL=0
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
JSON_RESULTS=()

pass() {
  TOTAL=$((TOTAL + 1)); PASS_COUNT=$((PASS_COUNT + 1))
  [[ $JSON_MODE -eq 1 ]] && JSON_RESULTS+=("{\"name\":\"$1\",\"status\":\"PASS\",\"detail\":\"$2\"}") \
    || echo -e " ${PASS} $1${2:+ — $2}"
}
fail() {
  TOTAL=$((TOTAL + 1)); FAIL_COUNT=$((FAIL_COUNT + 1))
  [[ $JSON_MODE -eq 1 ]] && JSON_RESULTS+=("{\"name\":\"$1\",\"status\":\"FAIL\",\"detail\":\"$2\"}") \
    || echo -e " ${FAIL} $1${2:+ — $2}"
}
warn() {
  TOTAL=$((TOTAL + 1)); WARN_COUNT=$((WARN_COUNT + 1))
  [[ $JSON_MODE -eq 1 ]] && JSON_RESULTS+=("{\"name\":\"$1\",\"status\":\"WARN\",\"detail\":\"$2\"}") \
    || echo -e " ${WARN} $1${2:+ — $2}"
}

separator() { [[ $JSON_MODE -eq 0 ]] && printf '\n  — %s\n' "$1"; }

# =============================================================================
[[ $JSON_MODE -eq 0 ]] && echo -e "${C_BOLD}HM SDP E-Absensi — VPS Dual Purpose Preflight Check${C_RESET}"
[[ $JSON_MODE -eq 0 ]] && echo -e "${C_BOLD}============================================================${C_RESET}"
HOSTNAME_F=$(hostname)
KERNEL_F=$(uname -r)
DATE_F=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
[[ $JSON_MODE -eq 0 ]] && echo -e " ${INFO} Host: ${HOSTNAME_F} | Kernel: ${KERNEL_F} | Date(UTC): ${DATE_F}\n"

# ---------- OS Release Check ----------
separator "Operating System"
if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  OS_ID="$ID"
  OS_VERSION="$VERSION_ID"
  OS_PRETTY="$PRETTY_NAME"
  if [[ "$OS_ID" == "ubuntu" && ( "$OS_VERSION" == "22.04" || "$OS_VERSION" == "24.04" ) ]]; then
    pass "OS Ubuntu $OS_VERSION LTS x86_64" "$OS_PRETTY (didukung resmi)"
  elif [[ "$OS_ID" == "ubuntu" ]]; then
    fail "OS Ubuntu version" "Ubuntu $OS_VERSION tidak didukung rekomendasi (pakai 22.04 LTS / 24.04 LTS)"
  else
    fail "OS distro" "$OS_PRETTY (bukan Ubuntu. Script panduan diuji hanya untuk Ubuntu 22.04.)"
  fi
else
  fail "File /etc/os-release" "Tidak ditemukan — OS terlalu tua / tidak standard"
fi

ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then pass "Architecture x86_64" "AMD64 / Intel 64 bit (Prisma + sharp native binaries tersedia)"
else fail "Architecture" "Arsitektur $ARCH tidak didukung (butuh x86_64)."; fi

# ---------- RAM Check ----------
separator "Memory"
RAM_KB=$(awk '/MemTotal:/ {print $2}' /proc/meminfo)
RAM_GB=$(( RAM_KB / 1024 / 1024 ))
SWAP_KB=$(awk '/SwapTotal:/ {print $2}' /proc/meminfo)
SWAP_MB=$(( SWAP_KB / 1024 ))
if [[ -n "${SKIP_RAM:-}" ]]; then
  warn "RAM (SKIPPED via env)" "Paksa skip check, hasil = ${RAM_GB} GB"
else
  if (( RAM_GB >= 8 )); then pass "RAM ${RAM_GB} GB" "Minimal 8 GB untuk shared App + Postgres terpenuhi"
  elif (( RAM_GB >= 6 )); then warn "RAM ${RAM_GB} GB" "Tidak ideal (butuh swap >= 3 GB untuk compile native modules)"
  else fail "RAM ${RAM_GB} GB" "KURANG! Minimal 8 GB (KVM 2 Hostinger). <6 GB = OOM compile/build dijamin terjadi."; fi
fi
if (( SWAP_MB >= 2048 )); then pass "Swap ${SWAP_MB} MB" "Safety buffer untuk burst build npm ci"
else warn "Swap ${SWAP_MB} MB" "Kosong / < 2 GB — disarankan buat swapfile 3 GB sebelum deploy."; fi

# ---------- CPU Check ----------
separator "CPU"
CPU_COUNT=$(nproc)
CPU_MODEL=$(awk -F: '/model name/ {print $2; exit}' /proc/cpuinfo | sed 's/^ *//')
if (( CPU_COUNT >= 2 )); then pass "CPU vCPU = ${CPU_COUNT}" "Model: ${CPU_MODEL:-unknown}"
else fail "CPU vCPU = ${CPU_COUNT}" "Kurang! 2 vCPU minimal (1 utk Node.js, 1 utk Postgres writer)."; fi

# ---------- Disk Check ----------
separator "Disk (NVMe) + inode"
ROOT_FREE_KB=$(df -Pk / | awk 'NR==2 {print $4}')
ROOT_FREE_GB=$(( ROOT_FREE_KB / 1024 / 1024 ))
ROOT_TOTAL_KB=$(df -Pk / | awk 'NR==2 {print $2}')
ROOT_TOTAL_GB=$(( ROOT_TOTAL_KB / 1024 / 1024 ))
DISK_TYPE=""
if [[ -d /sys/block ]]; then
  for d in /sys/block/nvme*; do
    if [[ -d "$d" ]]; then DISK_TYPE="NVMe (SSD)"; break; fi
  done
  if [[ -z "$DISK_TYPE" ]]; then for d in /sys/block/vd* /sys/block/sd*; do
    if [[ -d "$d" ]]; then DISK_TYPE="virtual block / SATA (bukan NVMe)"; break; fi
  done; fi
fi
if [[ -n "$DISK_TYPE" && "$DISK_TYPE" == *"NVMe"* ]]; then pass "Disk type" "$DISK_TYPE (I/O tinggi bagus untuk Postgres WAL)."
else warn "Disk type" "${DISK_TYPE:-unknown}. Hostinger KVM harusnya NVMe — jika bukan, tiket support."; fi
if (( ROOT_FREE_GB >= 50 )); then pass "Disk free ${ROOT_FREE_GB} GB (total ${ROOT_TOTAL_GB} GB)" "Cukup: node_modules 1 GB, build 100 MB, foto 3 tahun ~45 GB, postgres data ~30 GB sisa 10 GB logs"
elif (( ROOT_FREE_GB >= 25 )); then warn "Disk free ${ROOT_FREE_GB} GB" "Tipis — pertimbangkan KVM 4 untuk DB scale > 500 user nanti"
else fail "Disk free ${ROOT_FREE_GB} GB" "Terlalu sedikit! Tidak muat untuk foto + postgres + node_modules sekaligus."; fi
INODE_FREE=$(df -Pi / | awk 'NR==2 {print $4}')
if (( INODE_FREE > 50000 )); then pass "Inode free = ${INODE_FREE}" "Tidak akan penuh oleh file node_modules kecil"
else warn "Inode free = ${INODE_FREE}" "Kurang dari 50k — risiko npm install gagal ENOSPC inode."; fi

# ---------- Kernel + sysctl params untuk Postgres ----------
separator "Kernel & network"
KERNEL_MAJ=$(uname -r | cut -d. -f1)
KERNEL_MIN=$(uname -r | cut -d. -f2)
KERNEL_OK=0; (( KERNEL_MAJ > 5 || (KERNEL_MAJ == 5 && KERNEL_MIN >= 15) )) && KERNEL_OK=1
if (( KERNEL_OK )); then pass "Kernel >= 5.15" "$(uname -r)"
else fail "Kernel < 5.15" "$(uname -r) — security + io_uring lebih jelek."; fi

# Test apt reachability
if timeout 8 apt-get update -o Acquire::https::Timeout=8 -o Acquire::http::Timeout=8 >/dev/null 2>&1; then
  pass "APT repo reachable" "Dapat install Postgres 16 + NodeSource"
else warn "APT repo timeout" "Cek /etc/resolv.conf nameserver atau firewall Hostinger"
fi

# ---------- Network Bandwidth Quick ----------
separator "Network"
if command -v curl >/dev/null 2>&1; then
  IP_V4=$(curl -s -4 --max-time 5 https://ifconfig.me 2>/dev/null || echo "unknown")
  pass "IP publik V4" "${IP_V4} (cek DNS domain Anda sudah point A record ke IP ini)"
else warn "curl tidak tersedia" "Install manual: apt install -y curl"
fi

# ---------- Software Prereqs ----------
separator "Software availability (belum install = WARN, bukan FAIL)"
for pkg in curl wget git ca-certificates gnupg lsb-release ufw; do
  if command -v "$pkg" >/dev/null 2>&1; then pass "Package: $pkg" "Tersedia"
  else warn "Package: $pkg" "Belum ada — install step 1 panduan: apt install -y $pkg"
  fi
done

# ---------- Security baseline ----------
separator "Security baseline (opsional pre-hardening)"
if [[ "$(id -u)" -eq 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then pass "sudo installed" "OK untuk user deploy non-root nanti"
  else warn "sudo tidak ada" "apt install -y sudo"; fi
  if id deploy >/dev/null 2>&1; then warn "User 'deploy' sudah ada" "OK, nanti gunakan ini untuk app."
  else pass "User deploy belum ada" "Akan dibuat di step panduan"; fi
else fail "Script tidak dijalankan root/sudo" "Beberapa check (ufw, /proc/meminfo) butuh hak root."
fi
if command -v ufw >/dev/null 2>&1; then
  UFW_ST=$(ufw status 2>/dev/null | head -1 | awk -F: '{print $2}' | xargs)
  if [[ "$UFW_ST" == "active" ]]; then pass "UFW firewall = ACTIVE" "Bagus! Pastikan rule 22 80 443 sebelum enable ya (jika tidak terputus SSH)."
  else warn "UFW firewall = $UFW_ST" "Belum diaktifkan — akan diaktifkan step security hardening."
  fi
else warn "ufw tidak terinstall" "apt install -y ufw"; fi

# ---------- Final summary ----------
[[ $JSON_MODE -eq 0 ]] && separator "SUMMARY"
if [[ $JSON_MODE -eq 1 ]]; then
  printf '{"hostname":"%s","kernel":"%s","generated_at":"%s","total":%d,"pass":%d,"fail":%d,"warn":%d,"results":[%s]}\n' \
    "$HOSTNAME_F" "$KERNEL_F" "$DATE_F" "$TOTAL" "$PASS_COUNT" "$FAIL_COUNT" "$WARN_COUNT" \
    "$(IFS=,; echo "${JSON_RESULTS[*]}")"
else
  echo -e " Total checks: ${TOTAL} | ${C_GREEN}Pass: ${PASS_COUNT}${C_RESET} | ${C_RED}Fail: ${FAIL_COUNT}${C_RESET} | ${C_YELLOW}Warn: ${WARN_COUNT}${C_RESET}"
  if (( FAIL_COUNT > 0 )); then
    echo -e "\n${C_RED}❌ CRITICAL FAIL TERDETEKSI.${C_RESET} Perbaiki FAIL di atas sebelum melanjutkan step install."
    echo -e "   (Warn TIDAK blocking tapi sebaiknya di-fix juga untuk stabilitas production)."
    exit 1
  else
    echo -e "\n${C_GREEN}✅ Semua CRITICAL CHECK LULUS.${C_RESET}"
    if (( WARN_COUNT > 0 )); then echo -e "   Ada ${WARN_COUNT} warning — boleh lanjut tapi catat item WARN untuk ditangani nanti."; fi
    echo -e "   Lanjut ke STEP 1 panduan DEPLOY_VPS_DUAL_HOSTINGER.md (OS Hardening)."
    exit 0
  fi
fi
