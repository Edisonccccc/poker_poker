import { useStatsOverview, usePlayerStats } from "@/features/stats/hooks";
import { AuthImage } from "@/components/AuthImage";
import { money } from "@/lib/format";

export function StatsPage() {
  const overview = useStatsOverview();
  const players = usePlayerStats();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Stats</h1>

      <section className="rounded-2xl bg-slate-100 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          All time
        </h2>
        {overview.isLoading && (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
        {overview.data && (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sessions" value={String(overview.data.games)} />
            <Stat label="Tables" value={String(overview.data.tables)} />
            <Stat label="Cash in" value={money(overview.data.cashIn)} />
            <Stat label="Host take" value={money(overview.data.hostTake)} />
            <Stat label="Host costs" value={money(overview.data.hostCosts)} />
            <Stat
              label="Host net"
              value={money(overview.data.hostNet)}
              tone={overview.data.hostNet >= 0 ? "good" : "bad"}
            />
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Player leaderboard
        </h2>
        {players.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {players.data && players.data.length === 0 && (
          <p className="text-sm text-slate-400">No checked-out players yet.</p>
        )}
        {players.data && players.data.length > 0 && (
          <ul className="space-y-1">
            {players.data.map((p, i) => (
              <li
                key={p.playerId}
                className="flex items-center gap-3 rounded-xl bg-slate-100 p-2"
              >
                <span className="w-5 text-center text-sm text-slate-400">
                  {i + 1}
                </span>
                <AuthImage
                  photoId={p.photoId}
                  alt={p.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    {p.gamesPlayed} game{p.gamesPlayed === 1 ? "" : "s"} ·{" "}
                    {money(p.totalBuyIn)} in
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    p.totalNet >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {money(p.totalNet)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div
        className={`text-lg font-bold ${
          tone === "good"
            ? "text-emerald-600"
            : tone === "bad"
              ? "text-red-500"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
