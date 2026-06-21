# 05 — Build Plan

Build in milestone order. Each milestone is shippable and testable on its own.
Manual flows come before ML so you always have a working app. Hand milestones to
Claude CLI one at a time.

## Milestone 0 — Project setup ✅ (scaffolded)
- npm-workspaces monorepo: `client/` (Vite + React + TS strict + Tailwind + React
  Router + TanStack Query + PWA) and `server/` (Express + TS + Prisma).
- `docker-compose.yml` (local Postgres), `.env.example`, `render.yaml`.
- Prisma schema (full data model) + `db.ts`; Express `/api/health`; client status
  page hitting it via the `/api` fetch client.
- **Done when:** `npm run dev` runs both; Home shows API + DB connected after
  `docker compose up -d` + `npm run db:migrate`; client installs to iOS home screen.

## Milestone 1 — Auth & shell
- Server: `POST /api/auth/register`, `POST /api/auth/login` (bcrypt + JWT),
  `GET /api/auth/me`; auth middleware that sets `req.user`. First registered user
  can be promoted to `admin` manually (or via a seed).
- Client: login screen (password), token storage, `setAuthToken`, protected routes,
  bottom tab navigation, Home dashboard skeleton.
- Run the **initial Prisma migration** (`npm run db:migrate`), then
  `npm run db:sql` to apply the CHECK constraints + reporting views
  (`server/prisma/sql/constraints_and_views.sql`).
- **Done when:** a host can register, log in/out, and see an empty dashboard.

## Milestone 2 — Profiles (players & dealers, manual) ✅
- Server: photo upload/serve endpoints (`POST /api/photos`, `GET /api/photos/:id`),
  generic CRUD router for players & dealers (ownership-scoped to the host).
- Client: Profiles tab (players/dealers) — list / create / edit with photo capture
  (`CameraCapture` + library fallback, downscaled JPEG) and name. Photos render via
  `AuthImage` (authed blob fetch). No ML yet — just store the photo in Postgres.
- **Done when:** host can CRUD players and dealers with photos.

## Milestone 3 — Games & tables ✅
- Server: CRUD for `games`, nested table creation with `chip_denominations`
  (reference photos), table get/update/delete, ownership via game→host.
- Client: Games list + create-game sheet (date/time editable); Game detail with
  Tables/After-game/Stats tabs; Add-table sheet (type + stakes + denominations
  with reference photos, "lock in"); Table detail showing denominations.
- **Done when:** host can create a game and open tables with denominations.

## Milestone 4 — Live play (manual): check-in & buy-ins ✅
- Server: `player_sessions` / `dealer_sessions` check-in (dup-guarded), session
  lists with computed buy-in totals, `buy_in` ledger entries, remove session.
- Client: Table Detail operating screen — check in players/dealers by **name
  search** (`CheckInSheet`); record buy-ins on a `NumberPad` (`BuyInSheet`); shows
  each player's running buy-in total + time in; collapsible chips reference.
- **Done when:** host can run a table: check people in and log buy-ins.

## Milestone 5 — Check-out (manual) & settlement ✅
- Server: player check-out (chips + reimbursements, idempotent re-checkout → net),
  dealer check-out (tips), host-costs CRUD, other-party settlements, and a
  computed settlement summary (bank model).
- Client: player check-out sheet (chips + reimbursements + live net), dealer tips
  sheet; After-game tab = host summary (cash-in, payouts, host take, host net) +
  host costs + per-player net + dealer tips + other parties.
- Settlement is computed in the API (the SQL views in `docs/02` remain available
  for ad-hoc reporting / Milestone 8 stats).
- **Done when:** a full game can be run and settled end-to-end, manually.

> At this point you have a complete, reliable app. Everything below is ML on top.

## Milestone 6 — Face recognition ✅
- `@vladmandic/face-api` with CDN-loaded weights (`client/src/lib/face.ts`).
- Enrollment: descriptor computed from the captured photo on profile save and
  stored (`faceDescriptor`); `/descriptors` endpoint feeds matching.
- Face check-in: `CheckInSheet` has a Scan-face mode (`FaceScan`) — ranks the
  closest people for one-tap confirm, with name-search fallback always available.
- Host face-unlock deferred (secondary; password auth stands).
- **Done when:** check-in works by face, with manual fallback intact.

## Milestone 7 — Chip / tip counting ✅
- `POST /api/chips/count` (Express) calls Anthropic Claude vision with the count
  photo + the table's reference chip photos; key in `VISION_API_KEY`,
  model in `VISION_MODEL`. Returns 503 (manual fallback) when unconfigured.
- `ChipCountSheet`: capture → count → editable per-color review → use total.
  Wired into both player check-out (chips) and dealer check-out (tips).
- **Done when:** chip counts can be drafted from a photo and confirmed.

## Milestone 8 — Stats ✅
- Server: `/api/stats/overview` (host lifetime bank-model totals) and
  `/api/stats/players` (per-player aggregates: games, buy-ins, net, biggest
  win/loss).
- Client: Stats tab in nav (overview cards + player leaderboard); per-game Stats
  tab (`GameStatsPanel`) with leaderboard + by-table breakdown.
- **Done when:** host can review historical performance.

## Milestone 9 — Admin & polish ✅
- Admin role: `/api/admin/hosts` (requireAdmin) + Admin page listing every host
  with lifetime summary (games, tables, players, host net).
- Polish: profile deletion blocked (409) when game history exists, with a clear
  client message; catch-all route redirects to Home; loading/empty/error states
  throughout; confirmations on destructive actions; ≥44px tap targets.
- **Done when:** admin can see all hosts; UX is clean on iPhone + iPad.

---

## Testing per milestone
- Unit-test money math (net, totals, settlement) — pure functions, no floats.
- Manually walk the happy path on a phone-sized viewport each milestone.
- Verify ownership: a second host account cannot read/modify the first host's rows
  (test the API routes directly).
- ML milestones: test the fallback path explicitly (deny camera, no match,
  bad photo).

## Resolved decisions (confirmed with Edison, 2026-06-20)
1. **Host P&L = bank model.** No rake type. The host is the bank; their take is
   `cash_in − payouts` (player cash-outs + dealer tips + reimbursements), then
   minus host costs. See `v_game_summary` in `docs/02-data-model.md`.
2. **No per-hand/per-pot tracking.** The unit of truth is the player ledger:
   buy-in → cash-out → reimbursement, plus host costs. No rake/fee entry type.
3. **Currency = whole dollars** everywhere. `tables.uses_cents` stays but defaults
   `false`.
4. **Adjustments are signed.** `adjustment` entries may be negative; all other
   ledger types must be ≥ 0 (DB check constraint).
5. **Profiles are per-host.** Each host owns their own players/dealers.
6. **Tips are chips.** Dealer tip counting reuses the photo chip-counter.
7. **Photo retention = ask each time.** At settlement, prompt the host whether to
   keep that game's chip-count photos; store the choice in `games.retain_photos`.
   Profile photos always kept.
