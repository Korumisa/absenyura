#!/usr/bin/env bash
# ==========================================================================
# ufw-rules.sh — Idempotent UFW Hardening (1 VPS Dual Purpose)
# --------------------------------------------------------------------------
# Idenpotent: aman di-run berulang kali.
# Di-apply SETELAH ssh port 22 VERIFIED BISA MASUK dari client Anda.
#
# Usage (ROOT saja):
#   bash deploy/selfhost/security/ufw-rules.sh
#
# Aplikasi di VPS:
#   - Drop semua incoming DEFAULT (kecuali rule eksplisit)
#   - Allow 22/tcp (SSH) — batasi rate limit ufw limit: 6 / 30 detik / ip
#   - Allow 80/tcp (HTTP - redirect ke HTTPS lewat nginx)
#   - Allow 443/tcp (HTTPS — app via reverse proxy Nginx)
#   - BLOK PENUH port 5432 (postgres) + 6432 (pgbouncer) + 3001 (Node app internal)
#     Tidak ada allow dari 0.0.0.0. Hanya listen di 127.0.0.1 yang lolos loopback.
# ==========================================================================
set -uo pipefail

if [[ "$(id -u)" -ne 0 ]]; then echo "HARUS JALAN SEBAGAI ROOT"; exit 1; fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v ufw >/dev/null 2>&1; then
  apt-get install -y ufw --no-install-recommends || { echo "apt install ufw FAIL"; exit 1; }
fi

echo " — Reset ufw ke defaults..."
ufw --force reset 2>/dev/null || true

# Default policies — DROP ALL incoming / routing (VPS tidak jadi router), Allow Outbound
ufw default deny incoming
ufw default allow outgoing
ufw default deny routed

# SSH: rate limit (bukan open penuh — 6 koneksi / 30 detik)
ufw limit 22/tcp comment 'SSH rate limited 6/30s'

# HTTP (letsencrypt ACME challenge + non-HTTPS user akan 301 redirect Nginx)
ufw allow 80/tcp comment 'HTTP (ACME certbot + redirect)'
ufw allow 443/tcp comment 'HTTPS app reverse proxy Nginx'

# Pastikan loopback trusted — supaya Postgres socket / 127.0.0.1:5432 OK di dalam mesin
ufw allow in on lo from any to any comment 'Allow loopback (Postgres socket + 127.0.0.1)'
ufw allow out on lo from any to any comment 'Allow loopback outbound'

# Explicit DENY list port yang BOLEH TERBUKA JIKA LUPA DI-CLOSE:
for port in 5432 6432 3001 3000 5433 8080 9000 9229; do
  ufw deny "${port}/tcp" 2>/dev/null || true
done

# IPv6 support — enable di /etc/default/ufw
if [[ -f /etc/default/ufw ]]; then
  sed -i 's/^IPV6=.*/IPV6=yes/' /etc/default/ufw
fi

# --- Enable ufw non-interactive (PASTIKAN ANDA BISA SSH LAGI SETELAH INI) ---
echo "y" | ufw enable

echo "
==================== UFW STATUS ========================"
ufw status numbered verbose
echo "========================================================"
echo "
✅ Rules applied. Pastikan port:
   - 22  SSH:       LIMIT (6/30s) OK
   - 80  HTTP:      ALLOW
   - 443 HTTPS:     ALLOW
   - Port lain:     DENY

Jika Anda TERPUTUS SSH setelah ini:
  - Masuk ke Hostinger VPS Console (noVNC VNC KVM)
  - Login root -> jalankan: ufw allow 22/tcp -> ufw reload
"
exit 0
