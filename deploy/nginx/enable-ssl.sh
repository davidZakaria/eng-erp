#!/usr/bin/env bash
# Issue TLS for Eng-NJD ONLY — does not touch Tale/Wheelo/Backstage certs.
set -euo pipefail

DOMAIN="${1:-eng-njd.duckdns.org}"

echo "Checking nginx config..."
sudo nginx -t

echo "Requesting certificate for ${DOMAIN} only..."
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect \
  --register-unsafely-without-email || {
  echo ""
  echo "If that failed, run interactively (enter email when prompted):"
  echo "  sudo certbot --nginx -d ${DOMAIN}"
  exit 1
}

echo ""
echo "Verify HTTPS:"
echo "  curl -sI https://${DOMAIN}/en/login | head -10"
