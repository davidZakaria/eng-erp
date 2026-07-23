#!/usr/bin/env bash
# Updates DuckDNS A record to this server's public IP.
# Install on VPS cron: */5 * * * * /opt/eng-njd/deploy/duckdns-update.sh >> /var/log/duckdns.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/vps.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${DUCKDNS_SUBDOMAIN:?Set DUCKDNS_SUBDOMAIN in deploy/vps.env}"
: "${DUCKDNS_TOKEN:?Set DUCKDNS_TOKEN in deploy/vps.env}"

curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=" \
  && echo " DuckDNS updated for ${DUCKDNS_SUBDOMAIN}.duckdns.org"
