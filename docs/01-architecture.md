# 01 — Architecture

## Summary

A **Progressive Web App** (React + TypeScript) talking to a **Node + Express**
API backed by **Postgres** (via Prisma). One repo, two workspaces (`client/`,
`server/`). In production a single **Render web service** runs Express, which
serves both the `/api` routes and the built client; data lives in **Render
Postgres**. Face recognition runs in the browser; chip/tip counting runs in an
Express endpoint that calls a vision LLM so the API key stays server-side.
Installable on iPhone/iPad home screen.

```
┌─────────────────────────────────────────────────────────┐
│  client/  PWA (React + TS, Tailwind)   iPhone/iPad/web    │
│  • UI screens (routes/, features/)                        │
│  • face-api.js → face detect + 128-d descriptors          │
│  • camera (getUserMedia) for face + chip photos           │
│  • fetch client → /api (lib/api.ts)                       │
└───────────────┬──────────────────────────────────────────┘
                │ HTTPS  (same origin in prod; Vite proxy in dev)
                ▼
┌──────────────────────────────────────────────────────────┐
│  server/  Express + TypeScript                             │
│  • JWT email/password auth (bcrypt)                        │
│  • REST routes per domain (players, games, tables, …)      │
│  • Prisma ORM ──────────────► Postgres (Render / Docker)   │
│  • Photos stored as bytea (Photo table)                    │
│  • POST /api/chips/count ─────► vision LLM (key server-side)│
│  • serves built client (client/dist) in production         │
└──────────────────────────────────────────────────────────┘
```

## Frontend (`client/`)

- **React 18 + TypeScript (strict) + Vite.**
- **Tailwind CSS**, mobile-first, large tap targets.
- **React Router** for navigation, **TanStack Query** for all server state.
- **`lib/api.ts`** — tiny `fetch` wrapper. Adds the JWT `Authorization` header,
  throws on non-2xx. All feature `api.ts` files call through it.
- **`vite-plugin-pwa`** for installability + offline shell.
- **Dev proxy:** Vite forwards `/api` → `http://localhost:3001` so the client and
  server run on separate ports locally but look same-origin to the app.

### Folder layout
See `CLAUDE.md` → Project structure. One folder per domain under
`client/src/features/`, each exposing `api.ts` (calls the backend) + `hooks.ts`
(TanStack Query) + UI.

## Backend (`server/`)

- **Express + TypeScript.** Routers under `src/routes/`, one per domain.
- **Prisma ORM.** `prisma/schema.prisma` is the data-model source of truth
  (mirrors `docs/02-data-model.md`). `src/db.ts` exports the singleton client.
- **Auth:** email/password. Passwords hashed with **bcrypt**; sessions are
  **JWT** bearer tokens. Middleware attaches the authenticated user to each
  request; routes scope all queries to that host (admin may read all). There is
  **no database RLS** — ownership is enforced in the API layer, so never trust a
  client-supplied host/owner id.
- **Validation:** request bodies validated with **zod** before hitting Prisma.
- **Static serving:** in production Express serves `client/dist` and falls back to
  `index.html` for client-side routes.

### Photo storage
Photos (player/dealer avatars, chip reference photos, chip-count photos) are
stored **in Postgres** as `bytea` via a single `Photo` table (`data` + `mimeType`).
The client uploads base64/blob to an endpoint; the server writes the row and
returns its id. Reads stream the bytes back with the right content-type. This
keeps v1 setup-free (no object store); revisit S3/R2 if volume grows. Deleting a
player/dealer or declining chip-photo retention deletes the related `Photo` rows.

## ML services

- **Face recognition — client-side, `face-api.js`.**
  - On profile creation: detect the single largest face, compute a 128-d
    descriptor, store it on the player/dealer row (`Float[]`).
  - On check-in: capture from camera, compute a descriptor, compare (Euclidean
    distance) against the host's player/dealer descriptors, show the best
    candidate(s) for one-tap confirm.
  - Model weights are static files served with the client; cached for offline use.
- **Chip / tip counting — Express endpoint + vision LLM.**
  - `POST /api/chips/count` receives the photo + the table's denominations +
    reference photo ids; the server prompts the vision model and returns counts
    per color + total. The user confirms/edits before saving. Details in `docs/04`.

### Why this split
Face matching is high-frequency, latency-sensitive, and privacy-friendly in the
browser. Chip counting is low-frequency, needs a capable vision model and a secret
API key, so it lives on the server.

## Auth & login flow

1. Host opens app → if no valid JWT, **Login** screen.
2. Login by **password** (email + password → server verifies bcrypt hash →
   returns JWT) or **face unlock** (matches the host's enrolled face on-device,
   then uses the stored JWT). Password is the source of truth.
3. The JWT is sent on every `/api` request; middleware decodes it and scopes data
   to that host. Role (`admin` | `host`) controls cross-host access.

Face recognition's *primary* job is **player/dealer check-in**, not host auth.

## Local development

```
docker compose up -d     # Postgres on :5432
cp .env.example .env      # set DATABASE_URL, JWT_SECRET
npm install               # both workspaces
npm run db:migrate        # apply Prisma migrations
npm run dev               # client :5173 + server :3001
```

## Deployment (Render)

`render.yaml` defines one **web service** + one **Postgres** database.
- Build: `npm install && npm run build` (builds client then server).
- Start: `npm run db:deploy && npm run start` (applies migrations, then serves).
- `DATABASE_URL` is injected from the Render database; `JWT_SECRET` is generated;
  `VISION_API_KEY` is set manually (only needed once chip counting ships).

## Offline behavior (v1 scope)

App shell + ML model weights are cached by the service worker so the UI loads
without network. Data operations are **online-first**; a full offline write/sync
queue is out of scope for v1. Document this assumption with the host.

## Security notes

- Enforce host ownership on every route; never trust client-sent owner ids.
- Hash passwords with bcrypt; keep `JWT_SECRET` strong and server-only.
- Face descriptors and photos are personal data: store only what's needed, allow
  deleting a player/dealer (cascades photos + descriptor), and get verbal consent
  from players to be photographed.
- Keep the vision API key in server env only (`VISION_API_KEY`).
