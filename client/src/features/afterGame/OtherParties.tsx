import { useState } from "react";
import { useSettlement, useAddOtherParty, useDeleteOtherParty } from "./hooks";
import { money } from "@/lib/format";

/** Ad-hoc "other" parties in the settlement (people not tracked as players). */
export function OtherParties({ gameId }: { gameId: string }) {
  const { data } = useSettlement(gameId);
  const [label, setLabel] = useState("");
  const [net, setNet] = useState("");
  const add = useAddOtherParty(gameId);
  const del = useDeleteOtherParty(gameId);
  const others = data?.others ?? [];

  function submit() {
    if (!label.trim() || net === "") return;
    add.mutate(
      { label: label.trim(), net: Number(net) },
      { onSuccess: () => { setLabel(""); setNet(""); } },
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="label">Other parties</h2>
      {others.length > 0 && (
        <ul className="space-y-1">
          {others.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm"
            >
              <span className="truncate">{o.label}</span>
              <span className="flex items-center gap-3">
                <span className={o.net >= 0 ? "text-emerald-600" : "text-red-500"}>
                  {money(o.net)}
                </span>
                <button
                  onClick={() => del.mutate(o.id)}
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
      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name / label"
          className="input flex-1"
        />
        <input
          value={net}
          onChange={(e) => setNet(e.target.value)}
          inputMode="numeric"
          placeholder="net $"
          className="input w-24"
        />
        <button onClick={submit} className="btn-primary px-4 text-sm">
          Add
        </button>
      </div>
    </section>
  );
}
