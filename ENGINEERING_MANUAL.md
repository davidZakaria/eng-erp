# Eng-NJD — System Architecture & Engineering User Manual

**Version:** Production (Jamila Construction Package)  
**Platform:** https://eng-njd.duckdns.org  
**Stack:** NestJS · Prisma (PostgreSQL) · Next.js · MinIO · Socket.io  

---

## 1. Executive Summary

**Eng-NJD** is a Real Estate Engineering ERP built for active construction governance—not passive file storage. Its design philosophy is that of an **Active Engineering Constraint Engine**: every major workflow embeds cross-disciplinary **firewalls** that block unsafe or non-compliant actions before they reach the field.

Where traditional systems store drawings and BOQ spreadsheets, Eng-NJD **enforces** rules at the moment of decision:

| Risk | Firewall |
|------|----------|
| Building from obsolete CAD | Automatic drawing **superseding** on every new upload |
| Pouring concrete with open defects or pending MEP embeds | **Pour clearance locks** disable approval until gates pass |
| Unapproved vendor substitutions | **Deviation Pending Owner** status + predictive cost/lead-time recommendation |
| Electrical panel overload | **R-Y-B phase imbalance** calculation (>15% deviation flags panel) |
| Budget overrun in the field | **BOQ execution cap** — actual quantity cannot exceed planned without a Variation Order (VO) |
| Untraceable changes | **Forensic audit trail** with JSON before/after snapshots on every database mutation |

The system connects **consultants, head engineers, site teams, project management, and IT administration** through role-specific dashboards, bilingual UI (English/Arabic), real-time Insider Chat, and MinIO-backed secure file vaulting for heavy CAD/BIM assets.

---

## 2. Role-Based Access Control (RBAC) & Accounts

Eng-NJD defines nine roles in `Role` enum (`schema.prisma`). Each user receives one role; JWT authentication gates every API route via `@Roles()` decorators.

### Account routing (Web dashboards)

After login, users are redirected from `/dashboard` based on role:

| Role | Dashboard route |
|------|-----------------|
| `SUPER_ADMIN` | `/dashboard/super-admin` |
| `HEAD_ENGINEER` | `/dashboard/head-engineer` |
| `SITE_ENGINEER` | `/dashboard/site-engineer` |
| `CONSULTANT`, `ARCH_CONSULTANT`, `STRUCT_CONSULTANT`, `MEP_CONSULTANT` | `/dashboard/consultant` |
| `PROJECT_MANAGER`, `ADMIN` | `/dashboard/head-engineer` (shared engineering console) |
| Other legacy roles | `/dashboard/legacy` |

---

### SITE_ENGINEER — Field Execution

**Dashboard tabs:** Approved Drawings · Log Pour · BOQ Progress · Site Defects · RFIs

**Responsibilities & permissions:**

- **Approved Drawings** — Read-only register of head-engineer-approved sheets (`GET /drawings`). Site must not build from pending or superseded revisions.
- **Log Pour** — Record concrete pours against building components (`POST /execution-logs`). Captures volume, date, and notes after clearance is granted.
- **BOQ Progress** — Log installed quantities in the field (`POST /boq/execute-quantity`). Increments are auto-calculated (10% of remaining or minimum 1 unit). Blocked at 100% of planned quantity.
- **Site Defects** — Create high-severity defect records (`POST /defects`). Open **HIGH** defects in a pour zone automatically lock pour clearance for that zone.
- **RFIs** — View open Requests For Information (`GET /rfi`). Raise questions when drawings or specs are unclear.

**API access summary:** `GET /boq/items`, `POST /boq/execute-quantity`, `GET /drawings`, `POST /defects`, `PATCH /defects/:id/status`, `GET /rfi`, `POST /execution-logs`.

---

### ARCH_CONSULTANT — Architectural Document Control

**Dashboard:** Upload Drawing form + Drawing Register

**Responsibilities:**

- Upload new drawing revisions (`.dwg`, `.dxf`, `.pdf`) via **resumable MinIO multipart upload** with retry indicators.
- Provide **LOD metadata** (project number, sheet code, size, scale, construction package).
- Each upload of the same drawing number auto-increments revision and marks prior revisions **`SUPERSEDED`** (`drawings.service.ts` transaction).

**API:** `POST /drawings` (register from storage URL), multipart proxy upload, `GET /drawings`.

---

### STRUCT_CONSULTANT — Structural Document Control

**Same upload workflow as architectural consultants**, with discipline set to `STRUCTURAL`.

Structural consultants supply the approved structural sheets that head engineers reference during pour clearance QA/QC. **Pour clearance sign-off itself is performed by the Head Engineer** (see below)—not by the structural consultant role in the current system.

**API:** Same drawing endpoints as `ARCH_CONSULTANT`.

---

### MEP_CONSULTANT — MEP Submittals & Drawings

**Dashboard tabs:** MEP Submittals · Upload Drawing (default tab for MEP consultants)

**Responsibilities:**

- Create **Material Submittals** linked to CSI divisions and spec sections (`POST /mep/submittals`).
- Select approved vendors from the catalog or flag **unlisted vendor** deviations (requires equivalence letter URL).
- Upload MEP discipline drawings when required.

**Deviation logic:** If `isApprovedVendor = false`, status is automatically set to **`DEVIATION_PENDING_OWNER`** and the system computes a **predictive recommendation** from lead time (weeks) and cost delta (EGP):

- Lead time &lt; 4 weeks **and** cost delta &lt; 0 → *"Owner Override Advised: Saves schedule and reduces cost."*
- Cost delta &gt; 0 → *"High Risk: Increases budget. Evaluate standard vendors."*

---

### HEAD_ENGINEER — The Gatekeeper

**Dashboard tabs:** Pending Drawings · MEP Submittals · Structural QA/QC · Field Execution (5D BIM) · RFIs & Snags · Project Catalog · BOQ Management · Team Management

**Responsibilities:**

| Function | Action |
|----------|--------|
| **Drawing review** | Approve or reject consultant uploads (`POST /drawings/:id/review`). Approved drawings release to site. |
| **MEP review** | Approve (`APPROVED_FOR_CONSTRUCTION`) or reject (`REVISION_REQUESTED`) submittals. Can perform **Owner Approve** on deviation-pending items. |
| **Structural QA/QC** | Complete pour clearance checklist (Formwork, Rebar, PT Cables X & Y) and **Approve Concrete Pour** (`POST /structural/pour-clearances/:id/approve`). **Only HEAD_ENGINEER** may grant final pour clearance. |
| **5D execution** | Monitor BOQ planned vs actual; log field installs. |
| **RFIs & snags** | Answer RFIs (`PATCH /rfi/:id/answer`); manage open site issues. |
| **BOQ admin** | Create, edit, delete BOQ lines (`POST/PATCH/DELETE /boq/items`). |
| **Team management** | Create and soft-delete users (cannot manage `SUPER_ADMIN` accounts). |

**Pour clearance checklist** can also be updated by `PROJECT_MANAGER` and `ADMIN`, but **final pour approval is HEAD_ENGINEER only**.

---

### PROJECT_MANAGER / ADMIN — Commercial & Oversight

These roles share the **Head Engineer dashboard** for engineering oversight.

**Additional commercial responsibilities encoded in the system:**

- **MEP vendor deviations** — Review submittals in `DEVIATION_PENDING_OWNER` status with system-generated cost/schedule recommendations before owner-level approval.
- **RFI cost impact** — When answering an RFI with `impactsCost: true`, the API returns a VO workflow warning: *"Draft Variation Order (VO) workflow has been triggered for the Commercial Team."*
- **Structural visibility** — Can view and update pour clearance checklists but cannot final-approve pours (HEAD_ENGINEER only).
- **Drawing review** — Included in drawing review role set alongside head engineer.

**ADMIN** additionally supports catalog and audit-adjacent operations where `@Roles` permits, but **Forensic Audit Trail** and **System Backups** remain **SUPER_ADMIN exclusive**.

---

### SUPER_ADMIN — The IT Vault

**Dashboard tabs:** Team Management · Master Data (Catalog) · BOQ Management · Pending Drawings · Audit Trail · System Backups

**Exclusive capabilities:**

| Capability | Endpoint / behavior |
|------------|----------------------|
| **Forensic Audit Trail** | `GET /audit-logs` — view all mutations with JSON diff viewer (`oldData` / `newData` from Prisma middleware) |
| **User vault** | Full user CRUD including `SUPER_ADMIN` accounts (`/users`) |
| **Soft-delete users** | Sets `isActive: false` and `deletedAt` timestamp — no hard deletes |
| **Bulk drawing delete** | UI flag `enableBulkDelete` on Drawings Admin tab — Super Admin only |
| **Database backups** | `POST /backups/trigger` manual backup; `GET /backups/:id/download` presigned MinIO URL |
| **Scheduled backups** | Daily cron at 02:00 — `pg_dump` → gzip → optional AES-256-GCM encryption → MinIO |

Every Prisma `create`, `update`, `delete`, and `upsert` operation (except `AuditLog` and `SystemBackup` themselves) writes a forensic record with **before/after JSON snapshots**.

---

## 3. Core Engineering Workflows (The "Automated Firewalls")

### 3.1 Document Control — MinIO Vault & Versioning

**Large-file pipeline:**

1. Client initiates **S3-compatible multipart upload** via `/storage/multipart/*` (proxied through Next.js for consultant networks).
2. Parts upload with **automatic retry** (delays: 0s, 1s, 3s, 5s) and visible progress/retry UI (`TransferProgress`, `resilient-multipart-upload.ts`).
3. On completion, drawing metadata registers via `POST /drawings` with secure `fileUrl` — **MinIO is never exposed directly** to browsers; downloads use presigned URLs through the API proxy.

**Version control firewall:**

When a consultant uploads drawing number `AE-001` revision *N*:

```
Existing non-superseded revisions → status = SUPERSEDED
New record → revision = N+1, status = PENDING_REVIEW
```

Site engineers only see **approved** drawings. Building from superseded models is structurally prevented at the data layer.

---

### 3.2 Structural Integrity & Pour Clearance — The Domino Effect

The pour clearance engine (`structural.service.ts`) synchronizes three lock flags before any checklist or approval action:

```
┌─────────────────────┐
│ Open HIGH NCR on    │──► isLockedByNCR = true
│ same floor level    │
└─────────────────────┘
┌─────────────────────┐
│ Pending MEP         │──► isLockedByMEP = true
│ submittal (tag      │    (equipment tag matches zone)
│ matches pour zone)  │
└─────────────────────┘
┌─────────────────────┐
│ Open HIGH site      │──► isLockedByDefect = true
│ defect in zone      │    (defects.service syncs on create)
└─────────────────────┘
```

**When any lock is active:**

- Checklist toggles are **disabled** in UI
- API throws `ForbiddenException` with zone lock message
- **Approve Concrete Pour** button remains disabled

**Even with no locks**, all four checklist items must be true:

1. Formwork Approved  
2. Rebar Approved  
3. PT Cables X Approved  
4. PT Cables Y Approved  

Only then does `POST /structural/pour-clearances/:id/approve` set status to **`CLEAR_TO_POUR`**.

This domino chain prevents catastrophic failure scenarios: pouring with missing post-tension approval, open non-conformance reports, uncleared MEP sleeve/embed submittals, or unresolved high-severity site defects.

---

### 3.3 MEP Procurement & Phase Balancing

**Approved vendor enforcement:**

- Submittals linked to `ApprovedVendor` records in the project catalog (CSI division aligned).
- Unlisted vendors require `equivalenceLetterUrl` and enter **`DEVIATION_PENDING_OWNER`** — blocking standard head-engineer approval until owner/commercial review.

**Predictive lead time / cost delta:**

The MEP service evaluates `leadTimeWeeks` and `costDeltaEGP` at submission time and stores `systemRecommendation` for board-level decisions.

**Electrical phase balancing (R-Y-B):**

`GET /mep/panels/:id/load` calculates per-phase demand (VA × demand factor) and flags **`isUnbalanced`** when:

```
(maxPhaseLoad - averagePhaseLoad) / averagePhaseLoad > 0.15
```

This Red-Yellow-Blue imbalance detection prevents panel overloads before energization—derived from seeded `ElectricalPanel` and `PanelCircuit` schedules in the Jamila package.

**Pour clearance cross-link:**

Pending MEP submittals whose `equipmentTag` contains the pour zone key (e.g., `G1`) **lock structural pour clearance** until approved or rejected.

---

### 3.4 Commercial & 5D Execution — BOQ Firewall

**Data model:** `BOQItem` — `itemCode`, `description`, `unit`, `plannedQuantity`, `rateEGP`, `actualQuantity`, `divisionCode` (CSI).

**Field execution:**

```
POST /boq/execute-quantity
  IF actualQuantity + installedQuantity > plannedQuantity
    → 403 Forbidden: "BUDGET EXCEEDED: VO Required."
```

**UI behavior:**

- Progress bar turns **red at 100%**
- **Log Install** button disabled at baseline
- Head Engineer and Site Engineer can both log installs

**Variation Order path:**

Formal VO workflow UI is not yet a separate module. Commercial override is implemented by **increasing `plannedQuantity`** in BOQ Management (Head Engineer / Super Admin), after which field logging resumes. RFIs answered with `impactsCost: true` emit a VO draft warning for the commercial team.

**5D BIM meaning in Eng-NJD:**

| Dimension | Implementation |
|-----------|----------------|
| 3D | Drawing vault + discipline tagging |
| 4D | Pour logs, execution logs (schedule evidence) |
| 5D | BOQ planned vs actual quantities + rateEGP (cost stored; cost rollup UI planned) |

---

### 3.5 Real-Time Insider Chat

**Transport:** Socket.io WebSocket gateway (`chat.gateway.ts`) with JWT authentication on connect.

**Features:**

| Feature | Description |
|---------|-------------|
| **Team Lounge** | Global conversation (`isGlobal: true`) — all platform users |
| **Direct messages** | 1:1 conversations between teammates |
| **Notifications** | Toast alerts when widget closed; unread badge on floating button |
| **Language filter** | EN + AR profanity detection; 3 warnings → 1-minute mute |
| **Live status** | Connected/disconnected indicator on widget |

Chat runs as a persistent floating layer (`InsiderChatLayer`) on all authenticated pages—connecting field engineers on mobile networks with office-based reviewers instantly.

---

## 4. UI/UX & Localization

### Bilingual operation (English / Arabic)

- Powered by **next-intl** with message catalogs: `apps/web/messages/en.json`, `ar.json`.
- URL locale prefix: `/en/...` and `/ar/...`.
- **Language switcher** in dashboard header and login page.

### Dynamic RTL layout

- `LocaleHtmlAttributes` sets `document.documentElement.dir` to `rtl` for Arabic, `ltr` for English.
- Tailwind logical properties (`start`, `end`) used in navigation, chat widget, and form layouts for mirror-correct RTL.

### Light / Dark mode accessibility

- **next-themes** with `attribute="class"`, `defaultTheme="system"`, persisted to `localStorage` (`eng-njd-theme`).
- Theme toggle cycles: **Light → Dark → System** (Sun / Moon / Monitor icons).
- Global design tokens in `globals.css` — all surfaces use CSS variables (`--bg`, `--surface`, `--text`, `--border`, etc.) that swap under `.dark` class.
- Optimized for **bright outdoor field use** (light mode) and **office/low-light** environments (dark mode).
- `suppressHydrationWarning` on `<html>` prevents theme flash mismatches during SSR.

### Contextual help (presentation-ready)

- **Role welcome panel** — collapsible dashboard guide with role-specific abbreviations (BOQ, RFI, QA/QC, 5D BIM, PT, etc.).
- **Tab tooltips** — help icon on every dashboard tab with short summary.
- **Feature guide banners** — detailed instructions for the active tab.

---

## Appendix A — Key API Routes Reference

| Domain | Method | Route | Primary roles |
|--------|--------|-------|---------------|
| Auth | POST | `/auth/login` | Public |
| Drawings | GET | `/drawings` | All authenticated |
| Drawings | POST | `/drawings/:id/review` | HEAD_ENGINEER, PM, ADMIN |
| Storage | POST | `/storage/multipart/create` | Consultants |
| Structural | POST | `/structural/pour-clearances/:id/approve` | HEAD_ENGINEER |
| MEP | POST | `/mep/submittals` | MEP_CONSULTANT, HE, PM |
| MEP | POST | `/mep/submittals/:id/review` | HEAD_ENGINEER, PM, ADMIN |
| MEP | GET | `/mep/panels/:id/load` | HE, PM, MEP_CONSULTANT |
| BOQ | POST | `/boq/execute-quantity` | HEAD_ENGINEER, SITE_ENGINEER |
| Defects | POST | `/defects` | SITE_ENGINEER, HEAD_ENGINEER |
| RFI | PATCH | `/rfi/:id/answer` | Consultants, HEAD_ENGINEER |
| Audit | GET | `/audit-logs` | SUPER_ADMIN |
| Backups | POST | `/backups/trigger` | SUPER_ADMIN |
| Users | DELETE | `/users/:id` | SUPER_ADMIN, HEAD_ENGINEER (soft) |
| Chat | WS | `/socket.io` | All authenticated |

---

## Appendix B — Demo Accounts (Seed)

| Email | Role |
|-------|------|
| `super@eng-njd.local` | SUPER_ADMIN |
| `head@eng-njd.local` | HEAD_ENGINEER |
| `site@eng-njd.local` | SITE_ENGINEER |
| `mep@eng-njd.local` | MEP_CONSULTANT |
| `struct@eng-njd.local` | STRUCT_CONSULTANT |
| `arch@eng-njd.local` | ARCH_CONSULTANT |

Default password (development seed): `Password123!`

---

## Appendix C — Deployment Architecture

```
Browser (EN/AR, Light/Dark)
    ↓ HTTPS
Nginx (eng-njd.duckdns.org)
    ├── /          → Next.js (apps/web)
    ├── /api/proxy → NestJS API (apps/api)
    └── /socket.io → Chat WebSocket
         ↓
    PostgreSQL + MinIO (Docker Compose)
```

**Production rebuild (web-only UI change):**

```bash
cd /opt/eng-njd
git pull origin main
docker compose -p eng-njd -f docker-compose.prod.yml --env-file deploy/vps.env up -d --build web
```

---

*Eng-NJD — Active Engineering Constraint Engine · Built for Jamila · Egypt*
