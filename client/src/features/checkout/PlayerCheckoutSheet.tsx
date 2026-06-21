import { useState } from "react";
import { useCheckoutPlayer } from "./hooks";
import type { PlayerSession } from "@/features/sessions/api";
import { money, formatDuration } from "@/lib/format";

interface ReimbDraft {
  category: string;
  amount: string;
}

export function PlayerCheckoutSheet({
  tableId,
  session,
  onClose,
}: {
  tableId: string;
  session: PlayerSession;
  onClose: () => void;
}) {
  const [chips, setChips] = useState(
    session.chipsOut !== null ? String(session.chipsOut) : "",
  );
  const [reimb, setReimb] = useState<ReimbDraft[]>([]);
  const [hourlyReturn, setHourlyReturn] = useState(session.hourlyReturn);
  const [hourlyRate, setHourlyRate] = useState(session.hourlyRate ?? "25");
  const [error, setError] = useState<string | null>(null);
  const checkout = useCheckoutPlayer(tableId);

  const reimbTotal = reimb.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const hours =
    ((session.checkoutAt ? new Date(session.checkoutAt) : new Date()).getTime() -
      new Date(session.checkinAt).getTime()) /
    3_600_000;
  const comp = hourlyReturn
    ? Math.round((Number(hourlyRate) || 0) * hours * 100) / 100
    : 0;
  const net = (Number(chips) || 0) - session.buyInTotal + reimbTotal + comp;

  function patch(i: number, p: Partial<ReimbDraft>) {
    setReimb((rows) => rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }

  async function save() {
    if (chips === "") {
      setError("Enter the player's chip count.");
      return;
    }
    setError(null);
    try {
      await checkout.mutateAsync({
        sessionId: session.id,
        chipsOut: Number(chips),
        reimbursements: reimb
          .filter((r) => r.category.trim() && Number(r.amount) > 0)
          .map((r) => ({ category: r.category.trim(), amount: Number(r.amount) })),
        hourlyReturn,
        hourlyRate: Number(hourlyRate) || 0,
      });
      onClose();
    } catch (e) {
      setError("Couldn't check out.");
      console.error(e);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Check out</h2>
          <button
            onClick={save}
            disabled={checkout.isPending}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <p className="text-sm text-slate-500">
          {session.player.name} · {money(session.buyInTotal)} bought in
        </p>

        <label className="block space-y-1">
          <span className="label">Chip count (cash out)</span>
          <input
            value={chips}
            onChange={(e) => setChips(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className="input"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Reimbursements (optional)
          </span>
          {reimb.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={r.category}
                onChange={(e) => patch(i, { category: e.target.value })}
                placeholder="e.g. Uber"
                className="input flex-1"
              />
              <input
                value={r.amount}
                onChange={(e) => patch(i, { amount: e.target.value })}
                inputMode="numeric"
                placeholder="$"
                className="input w-24"
              />
              <button
                onClick={() => setReimb((rows) => rows.filter((_, j) => j !== i))}
                className="px-1 text-slate-400"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setReimb((rows) => [...rows, { category: "", amount: "" }])
            }
            className="min-h-tap w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            + Add reimbursement
          </button>
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Time comp{" "}
              <span className="text-slate-400">
                ({formatDuration(
                  session.checkinAt,
                  session.checkoutAt ?? undefined,
                )})
              </span>
            </span>
            <input
              type="checkbox"
              checked={hourlyReturn}
              onChange={(e) => setHourlyReturn(e.target.checked)}
              className="h-5 w-5 accent-violet-600"
            />
          </label>
          {hourlyReturn && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Rate $/hr</span>
              <input
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                inputMode="numeric"
                className="input w-24"
              />
              <span className="ml-auto text-sm font-semibold text-emerald-600">
                +{money(comp)}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-100 p-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Net (paid to player)</span>
          </div>
          <div
            className={`text-3xl font-bold ${
              net >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {money(net)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            chips {money(Number(chips) || 0)} − buy-ins{" "}
            {money(session.buyInTotal)} + reimb {money(reimbTotal)}
            {comp > 0 ? ` + time ${money(comp)}` : ""}
          </p>
        </div>

        {error && <p className="text-sm text-amber-600">{error}</p>}
      </div>
    </div>
  );
}
