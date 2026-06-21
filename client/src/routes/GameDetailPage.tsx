import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2, Pencil, ChevronRight } from "lucide-react";
import { useGame, useDeleteTable } from "@/features/games/hooks";
import { AddTableSheet } from "@/features/games/AddTableSheet";
import { EditSessionSheet } from "@/features/games/EditSessionSheet";
import { HostCosts } from "@/features/afterGame/HostCosts";
import { Insurance } from "@/features/afterGame/Insurance";
import { PaymentsPanel } from "@/features/afterGame/PaymentsPanel";
import { GameStatsPanel } from "@/features/stats/GameStatsPanel";
import { StatusPill } from "./GamesPage";
import {
  gameTypeLabel,
  formatGameDate,
  formatTime,
  tableEmoji,
  sessionEmoji,
} from "@/lib/format";
import type { TableSummary } from "@/features/games/api";

type Tab = "tables" | "costs" | "payments";

export function GameDetailPage() {
  const { id } = useParams();
  const gameId = id!;
  const { data: game, isLoading, isError } = useGame(gameId);
  const deleteTable = useDeleteTable(gameId);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tables");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (isError || !game)
    return <p className="text-sm text-amber-600">Couldn't load session.</p>;

  return (
    <div className="space-y-4">
      <Link to="/games" className="text-sm text-slate-500">
        ← Sessions
      </Link>

      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sessionEmoji(game.id)}</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {game.label || formatGameDate(game.gameDate)}
            </h1>
            <p className="text-sm text-slate-500">
              {formatGameDate(game.gameDate)} · {formatTime(game.startedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={game.status} />
          <button
            onClick={() => setEditing(true)}
            className="p-2 text-slate-400"
            aria-label="Edit session"
          >
            <Pencil size={18} />
          </button>
        </div>
      </header>

      <div className="flex rounded-xl bg-slate-100 p-1">
        {(
          [
            ["tables", "Tables"],
            ["costs", "Costs & Stats"],
            ["payments", "Payments"],
          ] as const
        ).map(([key, labelText]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`min-h-tap flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === key ? "bg-violet-600 text-white" : "text-slate-500"
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
              <p className="text-sm text-slate-400">No tables yet.</p>
            ) : (
              <ul className="space-y-2">
                {game.tables.map((t) => (
                  <TableRow
                    key={t.id}
                    table={t}
                    onDelete={() => {
                      if (
                        confirm(
                          "Delete this table? Check-ins and buy-ins will be removed.",
                        )
                      )
                        deleteTable.mutate(t.id);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "costs" && (
        <div className="space-y-5">
          <HostCosts gameId={gameId} />
          <Insurance gameId={gameId} />
          <GameStatsPanel gameId={gameId} tables={game.tables} />
        </div>
      )}

      {tab === "payments" && <PaymentsPanel gameId={gameId} />}

      {adding && (
        <AddTableSheet gameId={gameId} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <EditSessionSheet
          game={game}
          onClose={() => setEditing(false)}
          onDeleted={() => navigate("/games")}
        />
      )}
    </div>
  );
}

function TableRow({
  table,
  onDelete,
}: {
  table: TableSummary;
  onDelete: () => void;
}) {
  return (
    <li className="card flex items-center gap-3">
      <Link
        to={`/tables/${table.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-2xl">
          {tableEmoji(table.id)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">
            Table
          </div>
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">
              {gameTypeLabel(table.type)}
              {table.stakes ? ` ${table.stakes}` : ""}
            </span>
            <StatusPill status={table.status} />
          </div>
          <div className="mt-0.5 text-sm text-slate-500">
            {table.label ? `${table.label} · ` : ""}
            {table._count.playerSessions} player
            {table._count.playerSessions === 1 ? "" : "s"}
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-slate-300" />
      </Link>
      <button
        onClick={onDelete}
        className="shrink-0 p-2 text-slate-400"
        aria-label="Delete table"
      >
        <Trash2 size={18} />
      </button>
    </li>
  );
}
