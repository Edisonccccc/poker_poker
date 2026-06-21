import { useSettlement } from "@/features/afterGame/hooks";
import { OtherParties } from "@/features/afterGame/OtherParties";
import type { TableSummary } from "@/features/games/api";
import { gameTypeLabel, money } from "@/lib/format";

/** Session Stats tab: host money summary + leaderboard + dealers + by-table. */
export function GameStatsPanel({
  gameId,
  tables,
}: {
  gameId: string;
  tables: TableSummary[];
}) {
  const { data, isLoading, isError } = useSettlement(gameId);

  if (isLoading) return <p className="text-sm text-white/50">Loading…</p>;
  if (isError || !data)
    return <p className="text-sm text-amber-400">Couldn't load stats.</p>;

  const t = data.totals;
  const leaderboard = [...data.players].sort(
    (a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity),
  );

  return (
    <div className="space-y-5">
      <section className="card">
        <h2 className="label mb-2">Host summary</h2>
        <Row label="Cash in (buy-ins)" value={t.cashIn} />
        <Row label="Player cash-outs" value={-t.playerPayout} />
        <Row label="Dealer tips" value={-t.dealerPayout} />
        <Row label="Reimbursements" value={-t.reimbursements} />
        <div className="my-2 border-t border-white/10" />
        <Row label="Host take" value={t.hostTake} bold />
        <Row label="Host costs" value={-t.hostCosts} />
        <div className="my-2 border-t border-white/10" />
        <Row label="Host net" value={t.hostNet} bold big />
      </section>

      <section className="space-y-2">
        <h2 className="label">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-white/50">No players yet.</p>
        ) : (
          <ul className="space-y-1">
            {leaderboard.map((p) => (
              <li
                key={p.sessionId}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <span className="truncate">{p.player.name}</span>
                {p.net === null ? (
                  <span className="text-white/40">in play</span>
                ) : (
                  <span
                    className={p.net >= 0 ? "text-emerald-400" : "text-red-400"}
                  >
                    {money(p.net)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.dealers.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Dealers</h2>
          <ul className="space-y-1">
            {data.dealers.map((d) => (
              <li
                key={d.sessionId}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <span className="truncate">{d.dealer.name}</span>
                <span className="text-white/70">
                  {d.tipsTotal === null ? "—" : `${money(d.tipsTotal)} tips`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OtherParties gameId={gameId} />

      <section className="space-y-2">
        <h2 className="label">By table</h2>
        <ul className="space-y-2">
          {tables.map((tbl) => {
            const ps = data.players.filter((p) => p.tableId === tbl.id);
            const cashIn = ps.reduce((a, p) => a + p.buyInTotal, 0);
            const payout = ps.reduce((a, p) => a + (p.chipsOut ?? 0), 0);
            return (
              <li key={tbl.id} className="card">
                <div className="font-medium">
                  {gameTypeLabel(tbl.type)}
                  {tbl.stakes ? ` ${tbl.stakes}` : ""}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {ps.length} player{ps.length === 1 ? "" : "s"} ·{" "}
                  {money(cashIn)} in · {money(payout)} out
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  big,
}: {
  label: string;
  value: number;
  bold?: boolean;
  big?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm ${bold ? "text-white" : "text-white/60"}`}>
        {label}
      </span>
      <span
        className={`${big ? "text-xl" : "text-sm"} ${bold ? "font-bold" : ""} ${
          value < 0 ? "text-red-400" : bold ? "text-emerald-400" : "text-white/80"
        }`}
      >
        {money(value)}
      </span>
    </div>
  );
}
