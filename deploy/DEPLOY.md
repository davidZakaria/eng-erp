# Deploy Eng-NJD to VPS (72.61.192.84) with DuckDNS
# Safe alongside other projects — read "Coexistence" first.

## Coexistence (VPS already has other projects)

Eng-NJD is designed **not to interfere** with your existing 2 projects:

| What Eng-NJD uses | What it does **not** touch |
|-------------------|----------------------------|
| Docker project name `eng-njd` | Other compose projects / containers |
| Volumes `eng-njd-postgres-data`, `eng-njd-minio-data` | Other apps' databases or files |
| Network `eng-njd-net` | Other Docker networks |
| `127.0.0.1:13000` → web (configurable) | Host ports **80** / **443** |
| `127.0.0.1:19000` → MinIO (configurable) | Postgres **5432**, MinIO **9000** on host |
| Install path `/opt/eng-njd` | Other project directories |

**You add one new nginx `server` block** for `eng-njd.duckdns.org` — same pattern as your other sites. We do **not** replace or reload your whole nginx config automatically.

If ports `13000` or `19000` are already taken on the VPS, change in `deploy/vps.env`:

```bash
ENG_NJD_WEB_PORT=13001
ENG_NJD_MINIO_PORT=19001
```

Then update `deploy/nginx/host-snippet.conf` to match.

Check free ports on the VPS:

```bash
ss -tlnp | grep -E '13000|19000|80|443'
```

---

## 1. DuckDNS

1. Create a subdomain at [duckdns.org](https://www.duckdns.org) (e.g. `eng-njd`).
2. Point it to your VPS IP: **72.61.192.84** (same IP as other sites — DuckDNS is just another hostname).
3. Copy your DuckDNS token into `deploy/vps.env`.

## 2. Prepare secrets on the VPS

```bash
git clone https://github.com/davidZakaria/eng-erp.git /opt/eng-njd
cd /opt/eng-njd
cp deploy/vps.env.example deploy/vps.env
nano deploy/vps.env
```

**Required values in `deploy/vps.env`:**

| Variable | Notes |
|----------|--------|
| `PUBLIC_HOST` | Your DuckDNS host, e.g. `eng-njd.duckdns.org` |
| `PUBLIC_URL` | `https://eng-njd.duckdns.org` |
| `CORS_ORIGIN` | Same as `PUBLIC_URL` |
| `S3_PUBLIC_ENDPOINT` | `https://eng-njd.duckdns.org/s3` |
| `ENG_NJD_WEB_PORT` | Default `13000` — localhost only |
| `ENG_NJD_MINIO_PORT` | Default `19000` — localhost only |
| `DUCKDNS_SUBDOMAIN` | Subdomain only, e.g. `eng-njd` |
| `DUCKDNS_TOKEN` | From DuckDNS |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `BACKUP_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | Strong random password (Eng-NJD DB only) |
| `MINIO_ROOT_PASSWORD` / `MINIO_SECRET_KEY` | Strong random password (Eng-NJD MinIO only) |
| `SEED_SUPER_ADMIN_PASSWORD` | Your Super Admin password (min 12 chars) |

> **Security:** Never commit `deploy/vps.env`. Passwords stay only on the server.

Update `docker/minio-cors.prod.json` `AllowedOrigins` to match your `PUBLIC_URL` (reference only — community MinIO uses `CORS_ORIGIN` / `MINIO_API_CORS_ALLOW_ORIGIN` instead of per-bucket CORS).

## 3. Docker (skip if already installed)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

## 4. Deploy Eng-NJD stack only

```bash
chmod +x deploy/deploy.sh deploy/duckdns-update.sh
./deploy/deploy.sh
```

When prompted for production seed, answer **y** once to create the Super Admin account.

## 5. Hook into existing host nginx

```bash
sudo cp deploy/nginx/host-snippet.conf /etc/nginx/sites-available/eng-njd
# Edit server_name / ports if needed
sudo nano /etc/nginx/sites-available/eng-njd
sudo ln -sf /etc/nginx/sites-available/eng-njd /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

TLS (same certbot flow as your other projects):

```bash
sudo certbot --nginx -d eng-njd.duckdns.org
```

## 6. Super Admin login

- URL: `https://eng-njd.duckdns.org/en/login`
- Email: `SUPER_ADMIN_EMAIL` (default `super@eng-njd.local`)
- Password: `SEED_SUPER_ADMIN_PASSWORD` from `deploy/vps.env`

Use **Team Management** to create Head Engineer, consultants, and site users.

## 7. DuckDNS auto-update (cron)

```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/eng-njd/deploy/duckdns-update.sh >> /var/log/duckdns.log 2>&1") | crontab -
```

## 8. Useful commands (Eng-NJD only)

```bash
cd /opt/eng-njd
docker compose -p eng-njd -f docker-compose.prod.yml --env-file deploy/vps.env ps
docker compose -p eng-njd -f docker-compose.prod.yml --env-file deploy/vps.env logs -f api web
docker compose -p eng-njd -f docker-compose.prod.yml --env-file deploy/vps.env run --rm api npx prisma migrate deploy
```

## 9. Stop / remove Eng-NJD (other projects unaffected)

```bash
cd /opt/eng-njd
docker compose -p eng-njd -f docker-compose.prod.yml --env-file deploy/vps.env down
# Remove nginx site only:
sudo rm /etc/nginx/sites-enabled/eng-njd && sudo nginx -t && sudo systemctl reload nginx
```

## 10. Firewall

**Do not reset UFW** if your other projects already configured it. Eng-NJD only needs 80/443 open on the host — which you likely already have. No new public ports are required beyond that.
