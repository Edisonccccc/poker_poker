import { useState } from "react";
import { useCheckoutPlayer } from "./hooks";
import type { PlayerSession } from "@/features/sessions/api";
import { money } from "@/lib/format";

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
  const [error, setError] = useState<string | null>(null);
  const checkout = useCheckoutPlayer(tableId);

  const reimbTotal = reimb.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const net = (Number(chips) || 0) - session.buyInTotal + reimbTotal;

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
      });
      onClose();
    } catch (e) {
      setError("Couldn't check out.");
      console.error(e);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-felt-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-white/60">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Check out</h2>
          <button
            onClick={save}
            disabled={checkout.isPending}
            className="text-sm font-semibold text-emerald-400 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <p className="text-sm text-white/55">
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
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
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
                className="px-1 text-white/40"
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
            className="min-h-tap w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/80"
          >
            + Add reimbursement
          </button>
        </div>

        <div className="rounded-2xl bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm text-white/55">
            <span>Net (paid to player)</span>
          </div>
          <div
            className={`text-3xl font-bold ${
              net >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {money(net)}
          </div>
          <p className="mt-1 text-xs text-white/45">
            chips {money(Number(chips) || 0)} − buy-ins{" "}
            {money(session.buyInTotal)} + reimbursements {money(reimbTotal)}
          </p>
        </div>

        {error && <p className="text-sm text-amber-400">{error}</p>}
      </div>
    </div>
  );
}
