import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGame } from "@/features/games/hooks";
import { AddTableSheet } from "@/features/games/AddTableSheet";
import { HostCosts } from "@/features/afterGame/HostCosts";
import { GameStatsPanel } from "@/features/stats/GameStatsPanel";
import { StatusPill } from "./GamesPage";
import { gameTypeLabel, formatGameDate, formatTime } from "@/lib/format";
import type { TableSummary } from "@/features/games/api";

type Tab = "tables" | "stats";

export function GameDetailPage() {
  const { id } = useParams();
  const gameId = id!;
  const { data: game, isLoading, isError } = useGame(gameId);
  const [tab, setTab] = useState<Tab>("tables");
  const [adding, setAdding] = useState(false);

  if (isLoading) return <p className="text-sm text-white/50">Loading…</p>;
  if (isError || !game)
    return <p className="text-sm text-amber-400">Couldn't load session.</p>;

  return (
    <div className="space-y-4">
      <Link to="/games" className="text-sm text-white/55">
        ← Sessions
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {game.label || formatGameDate(game.gameDate)}
          </h1>
          <p className="text-sm text-white/55">
            {formatGameDate(game.gameDate)} · {formatTime(game.startedAt)}
          </p>
        </div>
        <StatusPill status={game.status} />
      </header>

      <div className="flex rounded-xl bg-white/5 p-1">
        {(
          [
            ["tables", "Tables"],
            ["stats", "Stats"],
          ] as const
        ).map(([key, labelText]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`min-h-tap flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === key ? "bg-felt-light text-white" : "text-white/55"
            }`}
          >
            {labelText}
          </button>
        ))}
      </div>

      {tab === "tables" && (
        <div className="space-y-5">
          <div className="space-y-3">
            <button onClick={() => setAdding(true)} className="btn-primary w-full">
              + Add table
            </button>
            {game.tables.length === 0 ? (
              <p className="text-sm text-white/50">No tables yet.</p>
            ) : (
              <ul className="space-y-2">
                {game.tables.map((t) => (
                  <TableRow key={t.id} table={t} />
                ))}
              </ul>
            )}
          </div>
          <HostCosts gameId={gameId} />
        </div>
      )}

      {tab === "stats" && (
        <GameStatsPanel gameId={gameId} tables={game.tables} />
      )}

      {adding && (
        <AddTableSheet gameId={gameId} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function TableRow({ table }: { table: TableSummary }) {
  return (
    <li>
      <Link to={`/tables/${table.id}`} className="card block active:bg-white/[0.07]">
        <div className="flex items-center justify-between">
          <span className="font-semibold">
            {gameTypeLabel(table.type)}
            {table.stakes ? ` ${table.stakes}` : ""}
          </span>
          <StatusPill status={table.status} />
        </div>
        <div className="mt-1 text-sm text-white/55">
          {table.label ? `${table.label} · ` : ""}
          {table._count.playerSessions} player
          {table._count.playerSessions === 1 ? "" : "s"}
        </div>
      </Link>
    </li>
  );
}
