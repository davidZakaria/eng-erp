#!/usr/bin/env bash
# Print nginx routing diagnostics (safe read-only).
set -euo pipefail

echo "=== Eng-NJD container ==="
curl -sI http://127.0.0.1:13000 2>/dev/null | head -5 || echo "13000 not responding"

echo ""
echo "=== Host routing for eng-njd.duckdns.org ==="
curl -sI -H 'Host: eng-njd.duckdns.org' http://127.0.0.1 2>/dev/null | head -8 || true
curl -sI https://eng-njd.duckdns.org/en/login 2>/dev/null | head -8 || echo "HTTPS not configured yet"

echo ""
echo "=== nginx -t ==="
sudo nginx -t 2>&1 || true

echo ""
echo "=== sites-enabled ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true

echo ""
echo "=== default_server / catch-all (can break Wheelo) ==="
grep -rn 'default_server\|server_name _' /etc/nginx/sites-enabled/ 2>/dev/null || echo "(none)"

echo ""
echo "=== server_name per site ==="
grep -rn 'server_name' /etc/nginx/sites-enabled/ 2>/dev/null || true

echo ""
echo "=== certbot nginx backups (restore Wheelo from here if needed) ==="
sudo ls -lt /var/lib/letsencrypt/backups/ 2>/dev/null | head -5 || echo "(no certbot backups dir)"
