#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/deploy/vps.env}"
COMPOSE=(docker compose -p eng-njd -f "$ROOT/docker-compose.prod.yml" --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/vps.env.example and fill secrets first."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

WEB_PORT="${ENG_NJD_WEB_PORT:-13000}"
MINIO_PORT="${ENG_NJD_MINIO_PORT:-19000}"

echo "==> Eng-NJD isolated deploy (project: eng-njd)"
echo "    Web:   127.0.0.1:${WEB_PORT}  (host nginx → DuckDNS)"
echo "    MinIO: 127.0.0.1:${MINIO_PORT} (/s3/ path)"
echo "    Does NOT bind ports 80/443 — your other projects stay untouched."
echo

cd "$ROOT"
"${COMPOSE[@]}" up -d --build

echo "==> Running database migrations"
"${COMPOSE[@]}" run --rm api npx prisma migrate deploy

read -r -p "Run production seed (Super Admin only)? [y/N] " CONFIRM
if [[ "${CONFIRM,,}" == "y" ]]; then
  "${COMPOSE[@]}" run --rm \
    -e SEED_MODE=production \
    -e SEED_SUPER_ADMIN_PASSWORD \
    -e SUPER_ADMIN_EMAIL \
    -e SUPER_ADMIN_NAME \
    api npm run prisma:seed
fi

echo "==> Updating DuckDNS"
bash "$ROOT/deploy/duckdns-update.sh"

echo
echo "Deploy complete."
echo "  Site (after host nginx snippet): ${PUBLIC_URL:-https://${PUBLIC_HOST:-eng-njd.duckdns.org}}"
echo "  Super Admin: ${SUPER_ADMIN_EMAIL:-super@eng-njd.local}"
echo
echo "Next step — add to EXISTING host nginx (one new site only):"
echo "  sudo cp deploy/nginx/host-snippet.conf /etc/nginx/sites-available/eng-njd"
echo "  sudo ln -sf /etc/nginx/sites-available/eng-njd /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "  sudo certbot --nginx -d ${PUBLIC_HOST:-eng-njd.duckdns.org}   # if TLS not yet set"
