#!/usr/bin/env bash
# Apply HTTPS nginx config with HTTP→HTTPS redirect (fixes browser "Not secure").
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOMAIN="${1:-eng-njd.duckdns.org}"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
TARGET="/etc/nginx/sites-available/eng-njd"
SOURCE="${REPO_ROOT}/deploy/nginx/host-snippet.ssl.conf"

if [[ ! -f "$CERT" ]]; then
  echo "Certificate not found: ${CERT}" >&2
  echo "Run first: sudo certbot --nginx -d ${DOMAIN}" >&2
  exit 1
fi

if [[ "$DOMAIN" != "eng-njd.duckdns.org" ]]; then
  echo "Replace server_name and ssl_certificate paths in snippet for ${DOMAIN}" >&2
  exit 1
fi

sudo cp "$SOURCE" "$TARGET"
sudo ln -sf "$TARGET" "/etc/nginx/sites-enabled/eng-njd"
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "HTTP should redirect to HTTPS:"
curl -sI "http://${DOMAIN}/en/login" | head -5
echo ""
echo "HTTPS should return 200:"
curl -sI "https://${DOMAIN}/en/login" | head -5
echo ""
echo "Open in browser: https://${DOMAIN}/en/login"
