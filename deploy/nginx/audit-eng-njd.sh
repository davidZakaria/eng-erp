#!/usr/bin/env bash
# Detect nginx misconfig that serves Eng-NJD over HTTP (causes Chrome "Not secure").
set -euo pipefail

FILE="${1:-/etc/nginx/sites-available/eng-njd}"

echo "=== ${FILE} ==="
if [[ ! -f "$FILE" ]]; then
  echo "Missing ${FILE}" >&2
  exit 1
fi

if grep -q 'listen 80' "$FILE" && grep -q 'proxy_pass' "$FILE"; then
  if awk '/listen 80/,/^}/' "$FILE" | grep -q 'proxy_pass'; then
    echo "PROBLEM: port 80 still proxies to the app over HTTP."
    echo "Fix: cd /opt/eng-njd && ./deploy/nginx/apply-ssl-config.sh"
    exit 1
  fi
fi

if awk '/listen 80/,/^}/' "$FILE" | grep -q 'return 301 https'; then
  echo "OK: port 80 redirects to HTTPS."
else
  echo "WARN: port 80 may not force HTTPS redirect."
fi

if grep -q 'fullchain.pem' "$FILE"; then
  echo "OK: TLS fullchain.pem configured."
else
  echo "WARN: no ssl_certificate fullchain.pem in config."
fi

echo ""
echo "Test from VPS:"
curl -sI http://eng-njd.duckdns.org/en/login | grep -E 'HTTP|Location' || true
