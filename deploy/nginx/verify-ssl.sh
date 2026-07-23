#!/usr/bin/env bash
# Verify Eng-NJD TLS cert, chain, and redirects from the VPS.
set -euo pipefail

DOMAIN="${1:-eng-njd.duckdns.org}"

echo "=== DNS ==="
dig +short "$DOMAIN" @8.8.8.8 || true
echo ""

echo "=== HTTP redirect ==="
curl -sI "http://${DOMAIN}/en/login" | grep -E 'HTTP|Location' || true
echo ""

echo "=== HTTPS response ==="
curl -sI "https://${DOMAIN}/en/login" | grep -E 'HTTP|Strict-Transport' || true
echo ""

echo "=== Certificate (must show CN=${DOMAIN}, issuer Let's Encrypt) ==="
echo | openssl s_client -connect "${DOMAIN}:443" -servername "$DOMAIN" 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
echo ""

echo "=== Chain verify ==="
echo | openssl s_client -connect "${DOMAIN}:443" -servername "$DOMAIN" 2>/dev/null \
  | openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /dev/stdin 2>&1 || true
echo ""

echo "=== nginx eng-njd SSL paths ==="
grep -E 'ssl_certificate|server_name|listen' /etc/nginx/sites-available/eng-njd 2>/dev/null || true
echo ""
echo "If CN matches and verify OK, the server TLS is correct."
echo "Browser 'Not secure' text = page loaded over HTTP, or wrong DNS on your PC."
echo "Modern Chrome no longer shows a padlock on HTTPS — click the tune icon → Connection is secure."
