-- Constraints and reporting views that Prisma can't express.
-- IDEMPOTENT: safe to run after every `prisma migrate` / `prisma migrate deploy`.
-- Apply with:  npm run db:sql   (see server/package.json)

-- ── CHECK constraints on ledger_entries ───────────────────────────────────────
-- Exactly one of player_session_id / dealer_session_id must be set.
alter table ledger_entries drop constraint if exists ledger_one_session;
alter table ledger_entries add constraint ledger_one_session
  check (num_nonnulls(player_session_id, dealer_session_id) = 1);

-- Only adjustments may be negative; all other types are >= 0.
alter table ledger_entries drop constraint if exists ledger_amount_sign;
alter table ledger_entries add constraint ledger_amount_sign
  check (type = 'adjustment' or amount >= 0);

-- ── Reporting views ───────────────────────────────────────────────────────────
-- Net result per player session: chips_out - buy_ins + reimbursements.
create or replace view v_player_session_net as
select
  ps.id        as player_session_id,
  ps.table_id,
  ps.player_id,
  coalesce(ps.chips_out, 0)                                          as chips_out,
  coalesce(sum(le.amount) filter (where le.type = 'buy_in'), 0)      as buy_in_total,
  coalesce(sum(le.amount) filter (where le.type = 'reimbursement'), 0) as reimburse_total,
  coalesce(ps.chips_out, 0)
    - coalesce(sum(le.amount) filter (where le.type = 'buy_in'), 0)
    + coalesce(sum(le.amount) filter (where le.type = 'reimbursement'), 0) as net
from player_sessions ps
left join ledger_entries le on le.player_session_id = ps.id
group by ps.id;

-- Dealer tips per session.
create or replace view v_dealer_session_net as
select
  ds.id as dealer_session_id,
  ds.table_id,
  ds.dealer_id,
  coalesce(ds.tips_total, sum(le.amount) filter (where le.type = 'tip'), 0) as tips_total
from dealer_sessions ds
left join ledger_entries le on le.dealer_session_id = ds.id
group by ds.id;

-- Game P&L for the host (bank model). host_take = cash_in - payouts;
-- host_net = host_take - host_costs.
create or replace view v_game_summary as
with by_game as (
  select
    g.id as game_id,
    g.host_id,
    coalesce((select sum(le.amount) from ledger_entries le
       join tables t on t.id = le.table_id
       where t.game_id = g.id and le.type = 'buy_in'), 0)              as cash_in,
    coalesce((select sum(pn.chips_out) from v_player_session_net pn
       join tables t on t.id = pn.table_id where t.game_id = g.id), 0) as player_payout,
    coalesce((select sum(dn.tips_total) from v_dealer_session_net dn
       join tables t on t.id = dn.table_id where t.game_id = g.id), 0) as dealer_payout,
    coalesce((select sum(le.amount) from ledger_entries le
       join tables t on t.id = le.table_id
       where t.game_id = g.id and le.type = 'reimbursement'), 0)       as reimbursements,
    coalesce((select sum(amount) from host_costs hc
       where hc.game_id = g.id), 0)                                    as host_costs
  from games g
)
select
  game_id, host_id, cash_in, player_payout, dealer_payout, reimbursements, host_costs,
  (cash_in - player_payout - dealer_payout - reimbursements)              as host_take,
  (cash_in - player_payout - dealer_payout - reimbursements - host_costs) as host_net
from by_game;
