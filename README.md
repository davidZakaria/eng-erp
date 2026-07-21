# Eng-NJD — Engineering Real Estate ERP

NestJS + Prisma + PostgreSQL + MinIO + Next.js monorepo for Egypt real-estate engineering workflows.

## Prerequisites

- Node.js 20+
- Docker Desktop
- PostgreSQL client tools (`pg_dump` on PATH for nightly backups)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment
cp .env.example apps/api/.env

# 3. Start infrastructure
docker compose up -d

# 4. Run migrations & seed
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Start API (port 3001) and Web (port 3000)
npm run dev:api
npm run dev:web
```

Open http://localhost:3000

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
