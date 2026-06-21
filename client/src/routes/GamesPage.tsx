import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ChevronRight } from "lucide-react";
import { useGames, useDeleteGame } from "@/features/games/hooks";
import { CreateGameSheet } from "@/features/games/CreateGameSheet";
import { formatGameDate, formatTime, sessionEmoji } from "@/lib/format";

export function GamesPage() {
  const { data, isLoading, isError } = useGames();
  const deleteGame = useDeleteGame();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
        <p className="text-sm text-slate-500">
          One session per game day. Tap a session to manage its tables.
        </p>
      </div>

      <button onClick={() => setCreating(true)} className="btn-primary w-full">
        + New session
      </button>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {isError && (
        <p className="text-sm text-amber-600">Couldn't load sessions.</p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-slate-400">
          No sessions yet. Create your first.
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-2">
          {data.map((g) => (
            <li key={g.id} className="card flex items-center gap-3">
              <Link
                to={`/games/${g.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-2xl">
                  {sessionEmoji(g.id)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">
                    Session
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {g.label || formatGameDate(g.gameDate)}
                    </span>
                    <StatusPill status={g.status} />
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">
                    {formatGameDate(g.gameDate)} · {formatTime(g.startedAt)} ·{" "}
                    {g._count.tables} table{g._count.tables === 1 ? "" : "s"}
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-300" />
              </Link>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Delete this session? All its tables and records are removed.",
                    )
                  )
                    deleteGame.mutate(g.id);
                }}
                className="shrink-0 p-2 text-slate-400"
                aria-label="Delete session"
              >
                <Trash2 size={18} />
              </button>
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
      className={`pill ${
        status === "open"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}
