import { useState } from "react";
import { Link } from "react-router-dom";
import { useGames } from "@/features/games/hooks";
import { CreateGameSheet } from "@/features/games/CreateGameSheet";
import { formatGameDate, formatTime } from "@/lib/format";

export function GamesPage() {
  const { data, isLoading, isError } = useGames();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Games</h1>

      <button
        onClick={() => setCreating(true)}
        className="min-h-tap w-full rounded-xl bg-felt-light px-4 py-3 text-base font-semibold"
      >
        + New game
      </button>

      {isLoading && <p className="text-sm text-white/50">Loading…</p>}
      {isError && <p className="text-sm text-amber-400">Couldn't load games.</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-white/50">No games yet. Create your first.</p>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-2">
          {data.map((g) => (
            <li key={g.id}>
              <Link
                to={`/games/${g.id}`}
                className="block rounded-2xl bg-white/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {g.label || formatGameDate(g.gameDate)}
                  </span>
                  <StatusPill status={g.status} />
                </div>
                <div className="mt-1 text-sm text-white/55">
                  {formatGameDate(g.gameDate)} · {formatTime(g.startedAt)} ·{" "}
                  {g._count.tables} table{g._count.tables === 1 ? "" : "s"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateGameSheet onClose={() => setCreating(false)} />}
    </div>
  );
}

export function StatusPill({ status }: { status: "open" | "closed" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "open"
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-white/10 text-white/50"
      }`}
    >
      {status}
    </span>
  );
}
