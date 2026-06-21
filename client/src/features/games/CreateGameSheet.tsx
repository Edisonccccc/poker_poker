import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateGame } from "./hooks";

function localDate(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function localTime(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
}

export function CreateGameSheet({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState(localTime());
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateGame();
  const navigate = useNavigate();

  async function save() {
    setError(null);
    try {
      const startedAt = new Date(`${date}T${time}`).toISOString();
      const game = await create.mutateAsync({
        label: label.trim() || null,
        gameDate: date,
        startedAt,
      });
      onClose();
      navigate(`/games/${game.id}`);
    } catch (e) {
      setError("Couldn't create the session.");
      console.error(e);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">New session</h2>
          <button
            onClick={save}
            disabled={create.isPending}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-50"
          >
            Create
          </button>
        </header>

        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Start time">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Label (optional)">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Friday night"
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-amber-600">{error}</p>}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
