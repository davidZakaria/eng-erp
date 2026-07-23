# Eng-NJD — Engineering Real Estate ERP

NestJS + Prisma + PostgreSQL + MinIO + Next.js monorepo for Egypt real-estate engineering workflows.

## Prerequisites

- Node.js 20+
- Docker Desktop
- PostgreSQL client tools (`pg_dump` on PATH for nightly backups)

## Quick Start (Windows + Docker)

```powershell
# 1. Install dependencies
npm install

# 2. Copy environment
Copy-Item .env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env.local

# 3. Open Docker Desktop from Start menu — wait for "Engine running"

# 4. Start infrastructure (retry if pull fails with "unexpected EOF")
docker context use desktop-linux
docker compose up -d

# Or run the all-in-one setup script:
# .\scripts\setup-docker.ps1

# 5. Run migrations & seed
npm run db:generate
npm run db:migrate
npm run db:seed

# 6. Start API (port 3001) and Web (port 3000)
npm run dev:api
npm run dev:web
```

Open http://localhost:3000

### Docker troubleshooting (Windows)

| Problem | Fix |
|---------|-----|
| `docker info` hangs | Open **Docker Desktop** → wait for **Engine running** → new PowerShell |
| `unexpected EOF` during pull | Network blip — run `docker compose pull` then `docker compose up -d` again |
| `pipe/dockerDesktopLinuxEngine` not found | Docker Desktop not started — launch it from Start menu |
| `>>` prompt in PowerShell | Press **Ctrl+C**, run one command per line |
| Wrong context | `docker context use desktop-linux` |

**MinIO console:** http://localhost:9001 — login `admin` / `password123` (see `.env.example`)

## Production deploy (VPS + DuckDNS)

See **[deploy/DEPLOY.md](deploy/DEPLOY.md)** — includes **coexistence** with other projects on the same VPS (no port 80/443 takeover).

```bash
cp deploy/vps.env.example deploy/vps.env   # set secrets on server only
./deploy/deploy.sh
# Then add deploy/nginx/host-snippet.conf to your EXISTING host nginx
```

Production seed creates **Super Admin only** — set `SEED_SUPER_ADMIN_PASSWORD` in `deploy/vps.env`, then create Head Engineer and team users from the dashboard.

## Demo Users (password: `Password123!`)

| Role | Email |
|------|-------|
| Project Manager | pm@eng-njd.local |
| Head Engineer | head@eng-njd.local |
| Site Engineer | site@eng-njd.local |
| Consultant | consultant@eng-njd.local |

## API Endpoints

| Method | Path | Roles |
|--------|------|-------|
| POST | `/auth/login` | public |
| POST | `/models/submissions` | CONSULTANT |
| GET | `/models/submissions` | role-scoped |
| POST | `/models/submissions/:id/review` | HEAD_ENGINEER |
| POST | `/boq` | PROJECT_MANAGER |
| POST | `/execution-logs` | SITE_ENGINEER |
| GET | `/reports/variance` | HEAD_ENGINEER, PROJECT_MANAGER |

## Architecture Highlights

- **Version control**: New consultant uploads auto-increment `versionNumber` and mark prior versions `SUPERSEDED`.
- **Site protection**: Site engineers only see `APPROVED_FOR_CONSTRUCTION` locked models.
- **Audit trail**: All POST/PUT/PATCH/DELETE requests log to `AuditLog`.
- **Backups**: Daily 2:00 AM cron — `pg_dump` → gzip → AES-256-GCM → MinIO `backups` bucket.
