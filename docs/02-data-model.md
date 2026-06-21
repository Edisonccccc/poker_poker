# 02 — Data Model

The canonical schema lives in **`server/prisma/schema.prisma`**. This file is the
human-readable companion: entity overview, semantics, and the raw SQL (CHECK
constraints + reporting views) that Prisma can't express and must be added in a
migration. Every schema change updates **both** the Prisma schema and this file,
then runs `npm run db:migrate`.

## Entity overview

```
users (host/admin — holds login credentials)
  └─ players                 (reusable, photo + face descriptor)
  └─ dealers                 (reusable, photo + face descriptor)
  └─ games                   (one per day, per host)
       └─ host_costs         (rent / food / other)
       └─ settlements        (game-level point checkout incl. "other" parties)
       └─ tables             (type + stakes)
            └─ chip_denominations   (color → value + reference photo)
            └─ player_sessions      (a player at this table: in/out + chips_out)
            └─ dealer_sessions      (a dealer at this table: in/out + tips)
            └─ ledger_entries       (buy_in / reimbursement / adjustment / tip)
photos (bytea blobs referenced by players, dealers, denominations, sessions)
```

### Key rules
- **Ownership:** every row traces up to a `users.id` (the host). Enforced in the
  **API layer** (there is no DB-level RLS) — never trust a client-supplied owner id.
- **Per-table scope:** sessions and ledger entries belong to a **table**, never
  directly to a game.
- **Unified ledger:** buy-ins, reimbursements, tips, and manual adjustments are all
  rows in `ledger_entries`, distinguished by `type`.
- **Computed money:** player net is derived, not stored (see views).

## Money representation
- All amounts use Postgres `numeric(12,2)` (Prisma `Decimal @db.Decimal(12,2)`).
  App code treats them as integers (whole dollars) unless a table sets
  `uses_cents = true`.
- Never floats.

## Enums

```sql
create type user_role     as enum ('admin', 'host');
create type game_type     as enum ('texas_holdem', 'blackjack');     -- extensible
create type game_status   as enum ('open', 'closed');
create type table_status  as enum ('open', 'closed');
create type session_status as enum ('active', 'checked_out');
create type ledger_type   as enum ('buy_in', 'reimbursement', 'tip', 'adjustment');
create type party_type    as enum ('player', 'dealer', 'other');
```

## Tables (SQL — reference)

> **Prisma generates the real DDL** (`server/prisma/schema.prisma`). The SQL below
> is illustrative reference only; where it disagrees with the Prisma schema, the
> Prisma schema wins. Differences to note: there is a **`users`** table (holds
> `email` + `password_hash` for our own JWT auth — no Supabase `auth.users`), and
> photos are rows in a **`photos`** table (bytea) referenced by `*_photo_id` FKs
> rather than `*_photo_path` storage strings.

```sql
-- Host / admin accounts (own auth: email + bcrypt hash + JWT)
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  display_name  text not null,
  role          user_role not null default 'host',
  face_descriptor  double precision[],   -- optional, for host face-unlock
  created_at    timestamptz not null default now()
);

-- Image blobs stored in Postgres
create table photos (
  id         uuid primary key default gen_random_uuid(),
  data       bytea not null,
  mime_type  text not null,
  created_at timestamptz not null default now()
);

-- Reusable player profiles, owned by a host
create table players (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  photo_id      uuid references photos(id),  -- avatar blob
  face_descriptor  double precision[],       -- 128-d, for check-in matching
  created_at    timestamptz not null default now()
);
create index on players(host_id);

-- Reusable dealer profiles, owned by a host
create table dealers (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  photo_path    text,                        -- storage: dealer-photos/<id>
  face_descriptor  double precision[],
  created_at    timestamptz not null default now()
);
create index on dealers(host_id);

-- A day's session under a host
create table games (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references users(id) on delete cascade,
  label         text,                        -- optional name
  game_date     date not null default current_date,
  started_at    timestamptz not null default now(),   -- editable
  status        game_status not null default 'open',
  retain_photos boolean,                       -- chip-count photo retention choice,
                                               -- set when host settles (null = undecided)
  created_at    timestamptz not null default now()
);
create index on games(host_id, game_date);

-- A table within a game
create table tables (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  type          game_type not null,
  stakes        text,                        -- e.g. "1/3", "25/50"
  label         text,                        -- optional display name
  uses_cents    boolean not null default false,
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  status        table_status not null default 'open',
  created_at    timestamptz not null default now()
);
create index on tables(game_id);

-- Per-table chip color → value, locked at table creation
create table chip_denominations (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid not null references tables(id) on delete cascade,
  color         text not null,               -- "red", "green", ...
  value         numeric(12,2) not null,      -- value of one chip
  ref_photo_path text,                       -- storage: chip-refs/<table>/<color>
  created_at    timestamptz not null default now(),
  unique (table_id, color)
);

-- A player seated at a table
create table player_sessions (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid not null references tables(id) on delete cascade,
  player_id     uuid not null references players(id) on delete restrict,
  checkin_at    timestamptz not null default now(),
  checkout_at   timestamptz,
  chips_out     numeric(12,2),               -- value of chips at checkout
  chip_method   text,                        -- 'manual' | 'photo'
  chip_photo_path text,                      -- storage: chip-counts/<session>
  status        session_status not null default 'active',
  note          text,
  created_at    timestamptz not null default now(),
  unique (table_id, player_id, checkin_at)
);
create index on player_sessions(table_id);

-- A dealer working a table
create table dealer_sessions (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid not null references tables(id) on delete cascade,
  dealer_id     uuid not null references dealers(id) on delete restrict,
  checkin_at    timestamptz not null default now(),
  checkout_at   timestamptz,
  tips_total    numeric(12,2),               -- total tips at checkout
  tips_method   text,                        -- 'manual' | 'photo'
  status        session_status not null default 'active',
  note          text,
  created_at    timestamptz not null default now()
);
create index on dealer_sessions(table_id);

-- Unified money ledger. Exactly one of the *_session_id is set.
create table ledger_entries (
  id                uuid primary key default gen_random_uuid(),
  table_id          uuid not null references tables(id) on delete cascade,
  player_session_id uuid references player_sessions(id) on delete cascade,
  dealer_session_id uuid references dealer_sessions(id) on delete cascade,
  type              ledger_type not null,
  amount            numeric(12,2) not null,  -- always positive; meaning by type
  category          text,                    -- 'uber','food','other' (reimburse)
  note              text,
  occurred_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  check (num_nonnulls(player_session_id, dealer_session_id) = 1),
  check (type = 'adjustment' or amount >= 0)   -- only adjustments may be negative
);
create index on ledger_entries(table_id);
create index on ledger_entries(player_session_id);
create index on ledger_entries(dealer_session_id);

-- Host's own costs for a game
create table host_costs (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  category      text not null,               -- 'rent','food','other'
  amount        numeric(12,2) not null,
  note          text,
  created_at    timestamptz not null default now()
);
create index on host_costs(game_id);

-- Game-level point checkout / settlement, incl. ad-hoc "other" parties
create table settlements (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  party_type    party_type not null,
  party_id      uuid,                        -- player/dealer id; null for 'other'
  label         text,                        -- name for 'other', or override
  checkin_at    timestamptz,                 -- manual: when they bought in
  checkin_amount  numeric(12,2),             -- manual: amount in
  checkout_at   timestamptz,                 -- manual: when they cashed out
  checkout_amount numeric(12,2),             -- manual: amount out
  net           numeric(12,2),               -- override; else computed in view
  note          text,
  created_at    timestamptz not null default now()
);
create index on settlements(game_id);
```

### Semantics of `ledger_entries.type`
- `buy_in` — player exchanged cash for chips. Increases what they've put in.
- `reimbursement` — host pays player back (uber/food/other). Increases payout to
  player. Use `category`.
- `tip` — dealer tip line (attach to `dealer_session_id`).
- `adjustment` — manual correction; `note` **required**. May be **signed**
  (positive or negative). All other types must be ≥ 0. Enforced by:
  `check (type = 'adjustment' or amount >= 0)`.

> **No rake type.** The host is the **bank**: their take is implicit in the cash
> flow (money players put in minus money paid out), not a per-hand/per-pot rake.
> Don't add a rake ledger type — see `v_game_summary` below.

## Derived views

```sql
-- Net result per player session: chips_out - buy_ins + reimbursements
create view v_player_session_net as
select
  ps.id            as player_session_id,
  ps.table_id,
  ps.player_id,
  coalesce(ps.chips_out, 0)                                   as chips_out,
  coalesce(sum(le.amount) filter (where le.type='buy_in'), 0) as buy_in_total,
  coalesce(sum(le.amount) filter (where le.type='reimbursement'), 0) as reimburse_total,
  coalesce(ps.chips_out,0)
    - coalesce(sum(le.amount) filter (where le.type='buy_in'),0)
    + coalesce(sum(le.amount) filter (where le.type='reimbursement'),0) as net
from player_sessions ps
left join ledger_entries le on le.player_session_id = ps.id
group by ps.id;

-- Dealer tips per session
create view v_dealer_session_net as
select
  ds.id as dealer_session_id, ds.table_id, ds.dealer_id,
  coalesce(ds.tips_total,
           sum(le.amount) filter (where le.type='tip'), 0) as tips_total
from dealer_sessions ds
left join ledger_entries le on le.dealer_session_id = ds.id
group by ds.id;

-- Game P&L for the host (BANK MODEL).
-- The host is the bank: cash comes in as buy-ins, goes out as player cash-outs,
-- dealer tip cash-outs, and reimbursements. Whatever's left is the host's take
-- (the implicit "rake" = chips that left circulation). Then subtract host costs.
--
--   cash_in     = Σ buy_ins
--   payouts     = Σ player chips_out + Σ dealer tips_out + Σ reimbursements
--   host_take   = cash_in − payouts
--   host_net    = host_take − Σ host_costs
create view v_game_summary as
with by_game as (
  select g.id as game_id, g.host_id,
    coalesce((select sum(le.amount) from ledger_entries le
       join tables t on t.id = le.table_id
       where t.game_id = g.id and le.type = 'buy_in'), 0)            as cash_in,
    coalesce((select sum(pn.chips_out) from v_player_session_net pn
       join tables t on t.id = pn.table_id where t.game_id = g.id), 0) as player_payout,
    coalesce((select sum(dn.tips_total) from v_dealer_session_net dn
       join tables t on t.id = dn.table_id where t.game_id = g.id), 0) as dealer_payout,
    coalesce((select sum(le.amount) from ledger_entries le
       join tables t on t.id = le.table_id
       where t.game_id = g.id and le.type = 'reimbursement'), 0)     as reimbursements,
    coalesce((select sum(amount) from host_costs hc
       where hc.game_id = g.id), 0)                                   as host_costs
  from games g
)
select
  game_id, host_id, cash_in, player_payout, dealer_payout, reimbursements, host_costs,
  (cash_in - player_payout - dealer_payout - reimbursements)              as host_take,
  (cash_in - player_payout - dealer_payout - reimbursements - host_costs) as host_net
from by_game;
```

> **Host P&L = bank model (confirmed).** No rake type; the host's take falls out
> of cash-in minus payouts. In a perfectly zero-sum, rake-free game `host_take`
> trends to 0 and `host_net` ≈ −host_costs. A positive `host_take` means chips
> left circulation (an effective rake/shortfall the host should reconcile).

## Authorization (app layer, not RLS)

There is **no database RLS**. The Express API enforces ownership on every route:

- Auth middleware decodes the JWT → `req.user = { id, role }`.
- For top-level entities (`players`, `dealers`, `games`), filter by
  `host_id = req.user.id`. Admins (`role = 'admin'`) may read across all hosts.
- For child entities (`tables`, sessions, `ledger_entries`, `chip_denominations`,
  `host_costs`, `settlements`), resolve ownership by walking up to the owning
  game/host before reading or writing.
- **Never** trust a client-supplied `host_id`/owner id — always derive it from the
  authenticated user. Validate request bodies with zod.

A reusable helper should assert "this game/table/session belongs to `req.user`"
and 404/403 otherwise, used by every mutating route.

## Photo storage (Postgres bytea)

Photos are rows in the **`photos`** table (`data bytea`, `mime_type`), referenced by
nullable FKs: `players.photo_id`, `dealers.photo_id`, `chip_denominations.ref_photo_id`,
`player_sessions.chip_photo_id`. Upload endpoint writes the row and returns its id;
a read endpoint streams bytes with the correct content-type (cache them).

Deletion: removing a player/dealer should delete its avatar `photos` row;
declining chip-photo retention at settlement (`games.retain_photos = false`)
deletes that game's chip-count `photos` rows. Handle cascades in app code.
(If photo volume ever grows, swap this table for S3/R2 behind the same endpoints.)
