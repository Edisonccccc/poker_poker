import { useState } from "react";
import { useSettlement, useAddHostCost, useDeleteHostCost } from "./hooks";
import { money } from "@/lib/format";

const CATEGORIES = ["rent", "food", "other"];

/** Host costs for a session (rent / food / other). Lives in the Tables tab. */
export function HostCosts({ gameId }: { gameId: string }) {
  const { data } = useSettlement(gameId);
  const [category, setCategory] = useState("rent");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const add = useAddHostCost(gameId);
  const del = useDeleteHostCost(gameId);
  const costs = data?.hostCosts ?? [];

  function submit() {
    if (!(Number(amount) > 0)) return;
    add.mutate(
      { category, amount: Number(amount), note: note.trim() || null },
      { onSuccess: () => { setAmount(""); setNote(""); } },
    );
  }

  return (
    <section className="card space-y-3">
      <h2 className="label">Host costs</h2>
      {costs.length > 0 && (
        <ul className="space-y-1">
          {costs.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm"
            >
              <span className="truncate capitalize">
                {c.category}
                {c.note ? ` · ${c.note}` : ""}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-slate-700">{money(c.amount)}</span>
                <button
                  onClick={() => del.mutate(c.id)}
                  className="text-slate-400"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition ${
              category === c ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="input flex-1"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="$"
          className="input w-24"
        />
        <button onClick={submit} className="btn-primary px-4 text-sm">
          Add
        </button>
      </div>
    </section>
  );
}
