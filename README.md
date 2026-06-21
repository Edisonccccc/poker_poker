# PokerPoker — local quickstart

Host manager for home poker & blackjack games. React PWA + Express/Prisma +
Postgres. Full specs in `docs/`.

## Prerequisites

- **Node 18+** (`node -v`)
- **Docker Desktop** running (for local Postgres) — or your own Postgres

## Run it locally

```bash
# 1. Start Postgres (Docker)
docker compose up -d

# 2. Env file (defaults already match docker-compose)
cp .env.example .env

# 3. Install both workspaces
npm install

# 4. Create the database tables
npm run db:migrate         # when prompted for a name, type:  init

# 5. Add CHECK constraints + reporting views
npm run db:sql

# 6. Start client + server together
npm run dev
```

Then open **http://localhost:5173**.

- Client (Vite) runs on **5173**, API (Express) on **3001**; the client proxies
  `/api` to the server automatically.
- The Home page shows API + Database as connected once everything is up.

## Try it (current milestones)

1. **Register** the first account → you become the **admin** (everyone after is a
   host). Sign out / sign in to confirm.
2. Go to **Profiles → Players → + New player**. Take a photo (or choose one),
   give a name, Save. Repeat under **Dealers**.
3. Edit a profile, change the photo/name, and try Delete.

Players, dealers, and photos persist in Postgres.

## Stop / reset

```bash
docker compose down        # stop Postgres (keeps data)
docker compose down -v     # stop and WIPE the database
```

## Troubleshooting

- **`db:migrate` can't connect** → is `docker compose up -d` running? Check
  `docker ps`. Port 5432 must be free (stop any other local Postgres).
- **Prisma engine download errors** → run again on a normal network (corporate
  proxies sometimes block `binaries.prisma.sh`).
- **Port already in use** → free 5173 / 3001 / 5432, or change `PORT` in `.env`.
- **Camera doesn't open** → browsers only allow the camera on `localhost` or
  HTTPS; the "Choose" file button always works as a fallback.
- **Prisma Studio** to inspect data: `npm run db:studio`.
