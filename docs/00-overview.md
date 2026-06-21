# 00 — Overview

## What this is

A management app for the **host** of home poker / blackjack sessions. It replaces
the notebook-and-mental-math the host uses to track who bought in for how much,
when people arrived and left, how many chips they cashed out, dealer tips, and
the host's own costs — then settles everyone up at the end.

It is designed for people who are **not** technical. The machine-learning parts
(face recognition, photo-based chip counting) are invisible: the user just takes
a photo and the app fills in the rest, with a manual override always available.

## Users & roles

- **Admin** — you. Can see every host's data across the whole system.
- **Host** — you and a few friends. Each host has their own account and runs their
  own games. A host sees only their own data.
- **Player** — a profile (photo + name) created by a host. Reused across games;
  face recognition logs them in instantly on later visits.
- **Dealer** — same as a player profile, but on the dealer side (tracks tips).

Players and dealers do **not** log in. They are records the host manages.

## Core concepts (glossary)

- **Game** — one day's session under one host, identified by date (+ optional
  label). Contains one or more tables.
- **Table** — a single playing table inside a game, with a type and stakes
  (e.g. *Texas Hold'em 1/3*, *Texas Hold'em 25/50*, *Blackjack*). Each table
  locks in its own **chip denominations** when created.
- **Chip denomination** — a color → value mapping for a table (e.g. red = 5),
  with a reference photo used by the chip-counting model.
- **Check-in** — a player or dealer joins a table (recorded with a timestamp).
- **Buy-in** — cash a player exchanges for chips at a table. Multiple per player;
  each records amount + time.
- **Check-out** — a player or dealer leaves a table. For players this captures the
  **chip count** (their final chips) and any **reimbursements**. For dealers it
  captures **tips**.
- **Reimbursement** — money the host gives back to a player on top of chips
  (e.g. Uber, other). Increases the player's payout.
- **Chip count** — value of a player's chips at check-out. Entered manually or
  read from a photo by the model.
- **Host cost** — the host's own expenses for the game: rent, food, other.
- **Point checkout / settlement** — the after-game reconciliation that produces
  the final number owed to/by each player, dealer, and "other" party.
- **Net (player)** — `chips_out − Σ buy_ins + Σ reimbursements`. Positive = host
  pays player; negative = player owes host.
- **Host take / net (bank model)** — the host is the bank. `host_take =
  Σ buy_ins − (Σ player chips_out + Σ dealer tips + Σ reimbursements)`; `host_net
  = host_take − Σ host_costs`. There is **no rake** — the host's take is just cash
  in minus cash out. Per-hand/per-pot amounts are not tracked.

## What the host can do (high level)

1. Log in (face or password).
2. Create/reuse **player** and **dealer** profiles (photo + name).
3. Create a **game** (date/time auto-filled, editable) and add **tables**
   (type, stakes, chip denominations + reference photos).
4. **Check players in** (face or name), record **buy-ins** (amount + time).
5. **Check players out**: count chips (photo or manual) + add reimbursements.
6. **Check dealers in/out**: record tips at check-out.
7. **After game**: enter host costs (rent/food/other) and run **point checkout**
   to settle players, dealers, and others.
8. View **stats** by table, player, and game.

## Non-goals (for now)

- No player-facing app or login.
- No real-money movement / payment processing — the app tracks points; cash
  changes hands in person.
- No online/remote play. This is for in-person home games.

## Design principles

- **Simple over complete.** Few taps, big buttons, number pads, minimal typing.
- **Manual always works.** ML pre-fills; the human confirms and can override.
- **Per-table truth.** All detailed tracking is scoped to a table so multiple
  tables in one game never get confused.
- **Computed settlement.** Final numbers are derived from ledger entries, never
  typed in by hand (except deliberate adjustments).
