import { useState } from "react";
import { useUpdateGame, useDeleteGame } from "./hooks";
import type { Status } from "./api";

function localDate(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
function localTime(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(11, 16);
}

export function EditSessionSheet({
  game,
  onClose,
  onDeleted,
}: {
  game: {
    id: string;
    label: string | null;
    gameDate: string;
    startedAt: string;
    status: Status;
  };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [date, setDate] = useState(localDate(game.gameDate));
  const [time, setTime] = useState(localTime(game.startedAt));
  const [label, setLabel] = useState(game.label ?? "");
  const [status, setStatus] = useState<Status>(game.status);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateGame();
  const del = useDeleteGame();

  async function save() {
    setError(null);
    try {
      const startedAt = new Date(`${date}T${time}`).toISOString();
      await update.mutateAsync({
        id: game.id,
        body: { label: label.trim() || null, gameDate: date, startedAt, status },
      });
      onClose();
    } catch (e) {
      setError("Couldn't save the session.");
      console.error(e);
    }
  }

  async function remove() {
    if (
      !confirm(
        "Delete this session? All its tables, check-ins and records are removed.",
      )
    )
      return;
    await del.mutateAsync(game.id);
    onDeleted();
  }

  return (
    <div className="sheet">
      <div className="sheet-body">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Edit session</h2>
          <button
            onClick={save}
            disabled={update.isPending}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <label className="block space-y-1">
          <span className="label">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </label>
        <label className="block space-y-1">
          <span className="label">Start time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        </label>
        <label className="block space-y-1">
          <span className="label">Label (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Friday night"
            className="input"
          />
        </label>

        <div className="space-y-1">
          <span className="label">Status</span>
          <div className="flex gap-2">
            {(["open", "closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`min-h-tap flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                  status === s
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-amber-600">{error}</p>}

        <div className="flex-1" />

        <button
          onClick={remove}
          disabled={del.isPending}
          className="min-h-tap rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-500 disabled:opacity-50"
        >
          Delete session
        </button>
      </div>
    </div>
  );
}
