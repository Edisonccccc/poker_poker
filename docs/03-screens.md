# 03 — Screens & Navigation

Mobile-first. Big tap targets, number pads over keyboards, minimal typing. Each
screen lists its purpose, key UI, data it reads/writes (→ `docs/02-data-model.md`),
and ML touchpoints (→ `docs/04-ml-features.md`).

## Navigation map

```
Login
 └─ Home (host dashboard: today's game + recent games)
     ├─ Profiles
     │    ├─ Players (list, create, edit)
     │    └─ Dealers (list, create, edit)
     ├─ Game
     │    ├─ Create Game
     │    └─ Game Detail (tabs: Tables · After Game · Stats)
     │         └─ Table Detail
     │              ├─ Check-in (player / dealer)
     │              ├─ Buy-in
     │              ├─ Player Check-out (chips + reimbursement)
     │              └─ Dealer Check-out (tips)
     └─ Admin (admin only: all hosts, all games)
```

Bottom tab bar (host): **Home · Games · Profiles · (Admin)**.

---

## Login
- **Purpose:** authenticate the host.
- **UI:** big "Log in with Face" button + "Use password" link. Password form:
  email + password.
- **ML:** face-unlock matches the host's enrolled descriptor, then resumes the
  device's stored JWT. Password is always available.
- **Writes:** none (auth only).

## Home (dashboard)
- **Purpose:** jump into today's work fast.
- **UI:** "Today's game" card (or "Create game" CTA), list of recent games with
  status chips (open/closed), quick links to Profiles.
- **Reads:** `games` for host, ordered by date.

## Players — list / create / edit
- **Purpose:** manage reusable player profiles.
- **UI (list):** searchable list with photo + name; "+ New player".
- **UI (create):** camera capture (or pick) → name field → save. Show a small
  "face detected ✓" confirmation.
- **ML:** on save, detect face → compute 128-d descriptor → store on `players`.
- **Writes:** `players` row + `player-photos` storage object.

## Dealers — list / create / edit
- Identical to Players, against `dealers` / `dealer-photos`.

## Create Game
- **Purpose:** start a day's session.
- **UI:** date (defaults today, editable), start time (defaults now, editable),
  optional label → "Create". Then prompt to **add first table**.
- **Writes:** `games` row.

## Game Detail (tabs)
Tabs: **Tables · After Game · Stats**.

### Tables tab
- **UI:** list of tables in this game with type/stakes, # active players, status;
  "+ Add table".
- **Add Table flow:**
  1. Pick type (Texas Hold'em / Blackjack) + stakes (e.g. 1/3, 25/50).
  2. Define **chip denominations**: for each color, value + a **reference photo**
     ("lock in"). Must define ≥1 before opening.
  3. Open table.
- **Writes:** `tables` + `chip_denominations` (+ `chip-refs` storage).

### After Game tab
Two sections:
- **Host Cost:** add lines — rent / food / other (amount + note). Running total.
  - Writes: `host_costs`.
- **Point Checkout (settlement):** reconcile **players · dealers · others**.
  - Players/dealers list shows computed net/tips from their table sessions; allow
    a manual override row. For **other** parties (untracked people), add a manual
    row: label, check-in time/amount, check-out time/amount → net.
  - Writes: `settlements`.
- **Summary footer:** players net, dealer tips, host costs, host bottom line
  (from `v_game_summary` — flag as needs-confirmation per build plan).

### Stats tab
- **UI:** views by **table**, **player**, **game** (and across games for a host):
  totals bought in, cashed out, net, tips, costs, time played, biggest win/loss.
- **Reads:** `v_player_session_net`, `v_dealer_session_net`, `v_game_summary`,
  plus raw sessions for time-on-table.
- Charts optional (later milestone).

## Table Detail
- **Purpose:** the live operating screen during play.
- **UI:** header (type/stakes/status), **Active players** list (name, total
  buy-in, time in) with quick "+ Buy-in" and "Check out", **Dealers** section,
  and "Check in" buttons for player & dealer. "Close table" when done.

### Check-in (player)
- **UI:** big **camera** view → recognize → show top candidate(s) → one-tap
  confirm. "Type name instead" fallback → searchable player list. Confirm →
  records check-in (time auto).
- **ML:** face match against host's players. If no profile match, offer "create
  player" inline.
- **Writes:** `player_sessions` (status active, checkin_at now).

### Check-in (dealer)
- Same as player against `dealers` → `dealer_sessions`.

### Buy-in
- **UI:** number pad for amount (chip presets optional), time auto (editable).
  Confirm. Repeatable.
- **Writes:** `ledger_entries` (type `buy_in`, `player_session_id`).

### Player Check-out
- **Purpose:** capture final chips + reimbursements → net.
- **UI, step 1 — chip count:**
  - "Take photo of chips" → model returns per-color counts + total → user
    reviews/edits each color on a number pad → confirm. OR "Enter manually".
  - Shows the table's reference chips for guidance.
- **UI, step 2 — reimbursements:** add lines (uber / food / other) amount + note.
- **UI, step 3 — review:** shows `chips_out − buy_ins + reimbursements = net`,
  check-out time (auto, editable). Confirm.
- **Writes:** update `player_sessions` (chips_out, chip_method, chip_photo_path,
  checkout_at, status checked_out) + `ledger_entries` (reimbursements).

### Dealer Check-out
- **UI:** count tips — "Take photo" (model) or manual number pad → review → time
  auto. Confirm.
- **Writes:** `dealer_sessions` (tips_total, tips_method, checkout_at, status) or
  `ledger_entries` type `tip`.

## Admin (admin only)
- **Purpose:** oversight across all hosts.
- **UI:** host picker → their games → drill into the same Game/Table screens
  (read-focused). Cross-host stats.
- **Reads:** everything (admin role bypasses host scoping in the API).

---

## Shared components
- `CameraCapture` — getUserMedia preview + shutter; returns a Blob; used by photo
  capture and ML capture.
- `FaceScan` — camera + face-api matching; emits candidate matches.
- `NumberPad` — large numeric entry for money/counts.
- `ChipCountEditor` — per-color rows with counts, total, photo button.
- `AmountList` — add/edit/remove money lines (buy-ins, costs, reimbursements).
- `PersonChip` — photo + name, used in lists and confirmations.

## UX rules
- Default every timestamp to "now"; always editable.
- Always offer the manual path beside any ML action.
- Confirm destructive actions (close table, delete profile).
- Never show model names, "AI", confidence scores, or jargon — just the result to
  confirm.
