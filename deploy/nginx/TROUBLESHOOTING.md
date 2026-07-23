# Nginx routing (Eng-NJD vs Tale / Wheelo / Backstage)

## Symptom: `eng-njd.duckdns.org` shows Tale (or breaks Wheelo)

**Cause:** Host nginx has no dedicated `server_name eng-njd.duckdns.org` block, so the **default server** (often Tale) answers. Or the wrong file from this repo was copied (`deploy/nginx/nginx.conf` is for Docker-only demos — **never** put it in `/etc/nginx/sites-enabled/`).

Eng-NJD Docker only listens on **127.0.0.1:13000**. It does not register a public hostname by itself.

## Safe fix (does not replace other projects)

```bash
cd /opt/eng-njd
git pull origin main

# 1) Stack must respond on localhost
docker compose -p eng-njd -f docker-compose.prod.yml --env-file deploy/vps.env ps
curl -sI http://127.0.0.1:13000 | head -5

# 2) Install ONLY the host snippet (explicit server_name)
chmod +x deploy/nginx/install-host-site.sh
./deploy/nginx/install-host-site.sh

# 3) Confirm nginx routes eng-njd hostname to 13000 (not Tale)
curl -sI -H 'Host: eng-njd.duckdns.org' http://127.0.0.1 | head -10
```

Expected: `HTTP/1.1 200` or `307` from Next.js — **not** Tale/Wheelo HTML.

## If Wheelo broke after certbot

Certbot sometimes edits the **first** server block in a file. Restore Wheelo from backup, then run certbot **only** for eng-njd:

```bash
# See what certbot changed recently
sudo ls -lt /etc/nginx/sites-available/

# Restore wheelo from backup if you have one (common on Ubuntu)
sudo cp /etc/nginx/sites-available/wheelo /etc/nginx/sites-available/wheelo.bak.$(date +%F) 2>/dev/null || true
# If you have a .bak from before, restore it manually:
# sudo cp /etc/nginx/sites-available/wheelo.bak.YYYY-MM-DD /etc/nginx/sites-available/wheelo

sudo nginx -t && sudo systemctl reload nginx
```

TLS for Eng-NJD **after** HTTP routing works:

```bash
sudo certbot --nginx -d eng-njd.duckdns.org
```

Do **not** run certbot with multiple unrelated domains in one command.

## Diagnostics

```bash
# DNS must point to this VPS
dig +short eng-njd.duckdns.org

# Enabled sites
ls -la /etc/nginx/sites-enabled/

# Catch-all / default server (often Tale)
grep -rn 'default_server\|server_name _' /etc/nginx/sites-enabled/

# Each site's server_name
grep -rn 'server_name' /etc/nginx/sites-enabled/
```

## Files in this repo

| File | Use on VPS host nginx? |
|------|-------------------------|
| `deploy/nginx/host-snippet.conf` | **Yes** — copy to `/etc/nginx/sites-available/eng-njd` |
| `deploy/nginx/nginx.conf` | **No** — Docker internal only |
| `deploy/nginx/nginx.conf.template` | **No** — uses `server_name _` catch-all |
