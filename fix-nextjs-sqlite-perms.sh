#!/usr/bin/env bash
set -euo pipefail

# fix-nextjs-sqlite-perms.sh
# Fix SQLITE_CANTOPEN for Next.js container using bind mount ./data:/app/data
# by ensuring ./data exists and is writable by UID/GID 1000:1000 (node user).

DATA_DIR="${1:-./data}"
TARGET_UID="${2:-1000}"
TARGET_GID="${3:-1000}"

echo "🔧 Fixing permissions for: ${DATA_DIR}"
echo "   Target owner: ${TARGET_UID}:${TARGET_GID}"

# Create directory if missing
mkdir -p "${DATA_DIR}"

# Ensure ownership and permissions
sudo chown -R "${TARGET_UID}:${TARGET_GID}" "${DATA_DIR}"
sudo chmod -R u+rwX "${DATA_DIR}"

# Quick sanity check (prints current state)
echo "✅ Done. Current state:"
ls -ld "${DATA_DIR}"
stat -c "owner=%u group=%g perms=%a path=%n" "${DATA_DIR}" 2>/dev/null || true

echo
echo "Tip: If your docker-compose.yml overrides user: \${UID}:\${GID},"
echo "either remove that line or run:"
echo "  sudo chown -R \$(id -u):\$(id -g) ${DATA_DIR}"