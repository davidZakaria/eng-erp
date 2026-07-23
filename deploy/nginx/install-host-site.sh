#!/usr/bin/env bash
# Install Eng-NJD as a NEW nginx site on the host — does NOT touch tale/wheelo/backstage.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SITE_NAME="eng-njd"
SOURCE="${REPO_ROOT}/deploy/nginx/host-snippet.conf"
TARGET="/etc/nginx/sites-available/${SITE_NAME}"

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing ${SOURCE}" >&2
  exit 1
fi

echo "Installing ${TARGET} (server_name must stay eng-njd.duckdns.org only)"
sudo cp "$SOURCE" "$TARGET"
sudo ln -sf "$TARGET" "/etc/nginx/sites-enabled/${SITE_NAME}"

echo "Checking nginx config..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "Verify Eng-NJD routing (should NOT show Tale/Wheelo HTML):"
echo "  curl -sI -H 'Host: eng-njd.duckdns.org' http://127.0.0.1 | head -5"
echo "  curl -sI http://127.0.0.1:13000 | head -5"
echo ""
echo "If Host header test still hits Tale, something else has default_server — run:"
echo "  grep -r 'default_server' /etc/nginx/sites-enabled/"
