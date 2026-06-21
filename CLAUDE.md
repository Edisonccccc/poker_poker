# CLAUDE.md — PokerPoker

Host-side management app for home poker & blackjack sessions. A host runs a
"game" (one day), which contains multiple tables. The app tracks players,
dealers, buy-ins, chip counts, tips, reimbursements, host costs, and final
point settlement — with face recognition for fast check-in and camera-based
chip/tip counting.

This file tells Claude CLI how to work in this repo. Full specs live in `docs/`.

## Read these first

- `docs/00-overview.md` — product vision, users, glossary
- `docs/01-architecture.md` — stack, system diagram, services
- `docs/02-data-model.md` — entities + semantics (canonical schema: `server/prisma/schema.prisma`)
- `docs/03-screens.md` — screen-by-screen UI specs
- `docs/04-ml-features.md` — face recognition + chip/tip counting
- `docs/05-build-plan.md` — phased milestones; **build in this order**

## Stack

- **Frontend (`client/`):** React 18 + TypeScript + Vite, Tailwind CSS, React
  Router, TanStack Query. Talks to the backend over a small `/api` fetch client.
- **PWA:** `vite-plugin-pwa`, installable on iPhone/iPad home screen. Camera via
  `getUserMedia`.
- **Backend (`server/`):** Node + Express + TypeScript. Prisma ORM over
  **Postgres**. Our own JWT email/password auth (bcrypt). Photos stored in
  Postgres as `bytea` (a `Photo` table).
- **ML:** `face-api.js` in the browser for face descriptors/matching; an Express
  endpoint (`/api/chips/count`) calls a vision LLM for chip/tip counting (keeps the
  API key server-side).
- **Hosting:** one Render web service (Express serves the API **and** the built
  client) + Render Postgres. Local dev DB via Docker (`docker-compose.yml`).
  See `render.yaml`.

## Project structure

```
/                        repo root (npm workspaces)
  package.json           workspaces + orchestration scripts (dev/build/start)
  docker-compose.yml     local Postgres
  render.yaml            Render blueprint (web service + Postgres)
  .env.example           single env file for the whole repo
  client/                Vite React app
    src/
      lib/               api client, ml (face-api) helpers
      components/        reusable UI (Button, Card, NumberPad, CameraCapture…)
      features/          one folder per domain: games, tables, players, dealers,
                         checkin, checkout, chips, afterGame, stats
      routes/            page components mapped by React Router
      types/             shared client types
  server/                Express + Prisma API
    prisma/schema.prisma data model (source of truth, mirrors docs/02)
    src/
      index.ts           express app; serves /api + the built client
      db.ts              prisma client
      env.ts             env loading/validation
      auth/              jwt, password hashing, middleware (Milestone 1)
      routes/            one router per domain
      lib/               vision chip-count call, helpers
  docs/                  specs (this folder)
```

## Conventions

- **TypeScript strict** on both client and server. No `any` without a
  `// reason:` comment.
- **Prisma schema is the source of truth** for data. When it changes, update
  `docs/02-data-model.md` **and** create a migration (`npm run db:migrate`).
- **Money/chips are integers** in the smallest tracked unit (whole dollars unless
  a table opts into cents). Never floats. DB type `Decimal(12,2)` (Prisma
  `Decimal`); handled as integer in app code.
- **Net is computed, never stored:** `net = chips_out − Σ buy_ins + Σ reimbursements`.
  Host take is the bank model (see data model) — there is **no rake type**.
- **Buy-ins, reimbursements, tips, adjustments are `LedgerEntry`** rows with a
  `type`. Don't invent parallel tables.
- **Per-table scope.** Player/dealer check-in & check-out always belong to a
  specific table, never directly to a game. Game-level settlement is separate.
- **Ownership in app code.** Every query must scope to the authenticated host
  (admin may read all). There's no DB-level RLS — enforce it in the API layer.
- **Names:** snake_case in DB (via Prisma `@map`), camelCase in TS, kebab-case for
  files/routes.
- **Mobile-first.** One-handed iPhone first, then iPad. Big tap targets (≥44px),
  minimal typing, number pads over keyboards. ML is invisible: the user just
  "takes a photo" — never surface model names or jargon in the UI.
- **Manual fallback always exists.** Every ML action (face login, chip count)
  must have a manual path that produces the same data.

## Commands

```bash
npm install                 # installs both workspaces
docker compose up -d        # start local Postgres
cp .env.example .env        # then fill in values
npm run db:migrate          # create/apply Prisma migrations (dev)
npm run db:sql              # apply CHECK constraints + reporting views (idempotent)
npm run dev                 # client (5173) + server (3001) together
npm run build               # build client then server
npm start                   # run production server (serves built client)
npm run db:studio           # Prisma Studio (browse data)
```

## Working agreement for Claude CLI

- Follow `docs/05-build-plan.md` milestone order. Don't jump ahead to ML before
  the manual flows and data model are solid.
- When the Prisma schema changes, update `docs/02-data-model.md` **and** add a
  migration. CHECK constraints and SQL views live in
  `server/prisma/sql/constraints_and_views.sql` (idempotent; applied via
  `npm run db:sql` after migrate, and on every Render deploy) — Prisma can't
  express them. Keep that file in sync with the schema.
- Keep screens dumb; put data logic in `client/src/features/*/api.ts` + TanStack
  Query hooks calling the Express API.
- Enforce host ownership on every server route.
- Ask before adding new top-level dependencies.
