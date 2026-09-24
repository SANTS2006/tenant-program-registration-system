# Program Registration Management Platform

A multi-tenant program registration platform: administrators create programs, each with its own fully
custom, versioned registration form (Google-Forms-style), and manage the registrations that come in —
with strict per-program data isolation enforced on the backend.

This repository currently implements **Phases 1–6** of the full platform spec: foundation, authentication
& RBAC, program management, the dynamic form builder, public registration, and registration management.
Analytics dashboards/charts, ID cards + QR verification, CSV/Excel export with background jobs, and full
production hardening (SEO prerendering, complete E2E suite, deployment automation) are intentionally out
of scope for this pass — see "What's not built yet" below. The architecture is shaped so those slot in
without a data-model rework.

## Stack

- **Frontend**: React 19, Vite, TypeScript, React Router, TanStack Query, TanStack Table, React Hook Form
  + Zod, Tailwind CSS, Radix UI primitives (shadcn-style components), @dnd-kit for the form builder.
- **Backend**: Node.js, TypeScript, Fastify, Zod validation, Drizzle ORM, JWT access + refresh-token auth,
  Argon2id password hashing, Cloudinary for file storage, Brevo for transactional email.
- **Database**: PostgreSQL (Neon), via `@neondatabase/serverless` (WebSocket `Pool`, so real
  multi-statement transactions are available — used for registration numbering and cascading writes).

## Project layout

```
/backend    Fastify API — routes → controllers → services → repositories, one module per domain
/frontend   Vite + React SPA — feature-folder structure under src/features/*
```

See `backend/src/modules/*` for the domain modules (auth, users, programs, forms, registrations,
uploads, email, audit, dashboard) and `frontend/src/features/*` for their UI counterparts.

## Local setup

1. **Install dependencies** (npm workspaces — run once at the repo root):
   ```bash
   npm install
   ```
2. **Configure environment variables**. Copy `.env.example` to `.env` at the repo root and fill in:
   - `DATABASE_URL` — a Neon Postgres connection string
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — for file uploads
   - `BREVO_API_KEY` — for transactional email (confirmation emails, password resets). If left blank,
     emails are logged to the console instead of sent, so the rest of the app still works in dev.
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` — any long random strings (already pre-filled with generated
     values for local dev; **replace them for any real deployment**).
3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```
4. **Seed sample data** (3 programs, 3 admin users with different roles, sample registrations):
   ```bash
   npm run db:seed
   ```
   Seeded logins (see console output for the authoritative list):
   - `admin@example.com` / `SuperAdmin123!` — super admin (sees everything)
   - `bootcamp.admin@example.com` / `ProgramAdmin123!` — program admin, scoped to "Web Development Bootcamp"
   - `viewer@example.com` / `Viewer123!` — viewer, scoped to "Leadership Training"
5. **Run the app**:
   ```bash
   npm run dev
   ```
   This starts the API on `http://localhost:4000` and the SPA on `http://localhost:5173` (which proxies
   `/api` to the backend, so cookies work without extra CORS configuration in dev).

## Deployment (Render)

In production a single Node service serves both the API (`/api/*`) and the built React app, so the
refresh-token cookie and `/api` calls share one origin. `render.yaml` is a Render Blueprint describing it:

- **Build:** `npm ci --include=dev && npm run build` (dev dependencies are needed for Vite/tsup).
- **Pre-deploy:** `npm run db:migrate` applies any new migrations before the new version goes live.
- **Start:** `npm start`, listening on `API_PORT=10000`. Health check: `GET /health`.

Environment variables marked `sync: false` in `render.yaml` are entered in the Render dashboard on first
deploy. `APP_URL`/`API_URL` must both be the public HTTPS address (e.g. `https://register.yourdomain.com`),
and `EMAIL_FROM_ADDRESS` must be a sender verified in Brevo. `JWT_SECRET`/`JWT_REFRESH_SECRET` are generated
by Render.

To test a production build locally: `npm run build`, then
`NODE_ENV=production API_PORT=4100 node --env-file=.env backend/dist/server.js` and open `http://localhost:4100`.

## Testing

```bash
npm test
```

Runs the backend's Vitest integration suite (via Fastify's `.inject()`, no server binding required)
against your configured `DATABASE_URL`. The suite covers auth, the registration submission → status
history flow, and — most importantly — **program data isolation**: it proves a `program_admin` scoped to
one program cannot list, fetch, or mutate another program's registrations, whether by direct access or by
swapping the `:programId` in the URL for a registration that belongs elsewhere. Test fixtures are created
and torn down per-run with unique names, so the suite is safe to run against your seeded dev database.

## Key architectural decisions

- **Program isolation is enforced at the service layer**, not via Postgres Row-Level Security. Every
  program-scoped route runs through `requireProgramAccess()` (`backend/src/middleware/authorize.ts`),
  which calls `assertProgramAccess()` (`backend/src/modules/programs/access.ts`) — the single point that
  decides whether the authenticated user may touch a given `programId`. A `super_admin` always passes; a
  `program_admin`/`viewer` must have a matching row in `program_members`. RLS was considered but skipped
  for this pass: it requires per-transaction `SET LOCAL` session variables that don't compose cleanly with
  a pooled/serverless driver, and would add a second, easy-to-desync enforcement path. A future hardening
  pass could add RLS as defense-in-depth on top of the service-layer checks.
- **Dynamic, versioned forms**: `forms` has one row per *version* (draft/published/archived), not one row
  per program. Editing after registrations exist creates or updates the draft version; publishing archives
  the previous published version rather than deleting it, so a registration's `formId` always resolves to
  the exact field definitions it was submitted against (`backend/src/modules/forms/service.ts`).
- **Registration data model**: `registrations.responses` is a JSONB blob keyed by each field's stable
  `fieldKey`, so completely different programs can have completely different forms without new tables or
  migrations per program. `applicantName`/`applicantEmail`/`applicantPhone` are pulled out into real
  columns (by field *type*, not by key) purely so search/filter/sort can use normal indexes instead of
  scanning JSONB.
- **Registration numbers** (`REG-2026-000123`) are generated with a single atomic
  `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` against a small `program_counters` table
  (`backend/src/modules/registrations/repository.ts`), scoped per program per year — safe under
  concurrent submissions without a separate locking step.
- **File uploads never touch the API server.** The backend only issues short-lived signed Cloudinary
  upload parameters (`backend/src/modules/uploads/service.ts`); the browser uploads directly to
  Cloudinary and reports back the resulting URL, which is validated and stored as a row in
  `registration_files`.

## What's not built yet (by design, this pass)

- Analytics dashboards (charts, demographic breakdowns, date-range aggregation) — the KPI counts that
  exist today (`/api/dashboard/overview`, `/api/programs/:id/registrations/stats`) are the foundation for
  this.
- ID card designer, PDF generation, QR verification endpoint (`programs.id_card_enabled` already exists
  as a column to build on).
- CSV/Excel export and any background job queue (BullMQ/Redis) — everything currently runs inline.
- SEO prerendering/sitemap generation, a full E2E test suite beyond the backend integration tests above,
  and production deployment automation.
