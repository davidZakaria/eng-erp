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
chmod +x deploy/nginx/enable-ssl.sh
./deploy/nginx/enable-ssl.sh eng-njd.duckdns.org
# Or interactively: sudo certbot --nginx -d eng-njd.duckdns.org
```

Do **not** run certbot with multiple unrelated domains in one command.

## Eng-NJD shows "Not secure"

Usually you are on **http://** not **https://**. Check:

```bash
curl -sI http://eng-njd.duckdns.org/en/login | head -5   # should be 301 → https
curl -sI https://eng-njd.duckdns.org/en/login | head -5  # should be 200
```

If HTTP returns **200** (not 301), port 80 is serving the site without redirecting. Fix:

```bash
cd /opt/eng-njd
git pull origin main
# Issue cert if missing
sudo certbot certonly --nginx -d eng-njd.duckdns.org
chmod +x deploy/nginx/apply-ssl-config.sh
./deploy/nginx/apply-ssl-config.sh eng-njd.duckdns.org
```

Then open **https://eng-njd.duckdns.org/en/login** (note the `https://`).

Expected until certbot runs. The Docker stack is HTTP on localhost; host nginx must terminate TLS with Let's Encrypt. After `certbot --nginx -d eng-njd.duckdns.org`, use `https://eng-njd.duckdns.org/en/login`.

Ensure `deploy/vps.env` has:

```bash
PUBLIC_URL=https://eng-njd.duckdns.org
CORS_ORIGIN=https://eng-njd.duckdns.org
S3_PUBLIC_ENDPOINT=https://eng-njd.duckdns.org/s3
```

Then restart Eng-NJD so API picks up HTTPS URLs:

```bash
docker compose -p eng-njd -f docker-compose.prod.yml --env-file deploy/vps.env up -d
```

## Wheelo still broken — restore order

1. **Fix nginx syntax first** (Wheelo and everything else depends on this):

```bash
sudo nginx -t
```

2. **Find Wheelo's config** (name may vary):

```bash
ls -la /etc/nginx/sites-available/ | grep -i wheelo
grep -rn 'wheelo' /etc/nginx/sites-enabled/
```

3. **Restore from certbot backup** (if certbot edited Wheelo):

```bash
sudo ls -lt /var/lib/letsencrypt/backups/
# certbot stores numbered backups — restore the newest backup BEFORE eng-njd changes:
# sudo cp /var/lib/letsencrypt/backups/XXXXX /etc/nginx/sites-available/wheelo
```

4. **Or restore manual .bak** if you created one:

```bash
sudo cp /etc/nginx/sites-available/wheelo.bak /etc/nginx/sites-available/wheelo
sudo nginx -t && sudo systemctl reload nginx
```

5. **Remove bad catch-all** Eng-NJD files if present (must NOT use `server_name _`):

```bash
grep -rn 'server_name _' /etc/nginx/sites-enabled/
# sudo rm /etc/nginx/sites-enabled/<bad-file>
```

6. Run full diagnostics:

```bash
chmod +x deploy/nginx/diagnose-host.sh
./deploy/nginx/diagnose-host.sh
```

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
