import { useSettlement } from "@/features/afterGame/hooks";
import type { TableSummary } from "@/features/games/api";
import { gameTypeLabel, money } from "@/lib/format";

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

  const leaderboard = [...data.players].sort(
    (a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity),
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
          Leaderboard
        </h3>
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

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
          By table
        </h3>
        <ul className="space-y-2">
          {tables.map((t) => {
            const ps = data.players.filter((p) => p.tableId === t.id);
            const cashIn = ps.reduce((a, p) => a + p.buyInTotal, 0);
            const payout = ps.reduce((a, p) => a + (p.chipsOut ?? 0), 0);
            return (
              <li key={t.id} className="rounded-2xl bg-white/5 p-3">
                <div className="font-medium">
                  {gameTypeLabel(t.type)}
                  {t.stakes ? ` ${t.stakes}` : ""}
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
