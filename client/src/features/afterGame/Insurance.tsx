import { useState } from "react";
import {
  useSettlement,
  useAddInsurance,
  useUpdateInsurance,
  useDeleteInsurance,
} from "./hooks";
import { useProfiles } from "@/features/profiles/hooks";
import { money } from "@/lib/format";

/**
 * Player insurance: premium when a player insures a strong hand; payout if they
 * get bad-beat. Both flow into the host take and the player's settlement net.
 */
export function Insurance({ gameId }: { gameId: string }) {
  const { data } = useSettlement(gameId);
  const players = useProfiles("player");
  const add = useAddInsurance(gameId);
  const update = useUpdateInsurance(gameId);
  const del = useDeleteInsurance(gameId);

  const [playerId, setPlayerId] = useState("");
  const [premium, setPremium] = useState("");
  const [payout, setPayout] = useState("");
  const rows = data?.insurance ?? [];

  function submit() {
    if (!(Number(premium) > 0)) return;
    add.mutate(
      {
        playerId: playerId || null,
        premium: Number(premium),
        payout: Number(payout) || 0,
      },
      {
        onSuccess: () => {
          setPremium("");
          setPayout("");
        },
      },
    );
  }

  return (
    <section className="card space-y-3">
      <h2 className="label">Insurance</h2>
      <p className="text-xs text-slate-400">
        Premium when a player insures a strong hand; payout if they're bad-beat.
        Both count toward profit.
      </p>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="space-y-1 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="truncate">{r.playerName ?? "Player"}</span>
                <button
                  onClick={() => del.mutate(r.id)}
                  className="text-slate-400"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Premium {money(r.premium)}</span>
                <span>· Payout</span>
                <input
                  defaultValue={r.payout ? String(r.payout) : ""}
                  onBlur={(e) =>
                    update.mutate({
                      id: r.id,
                      body: { payout: Number(e.target.value) || 0 },
                    })
                  }
                  inputMode="numeric"
                  placeholder="0"
                  className="input w-16 py-1 text-center text-xs"
                />
                <span
                  className={`ml-auto font-semibold ${
                    r.net >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {money(r.net)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="input"
        >
          <option value="">Player (optional)</option>
          {players.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            inputMode="numeric"
            placeholder="Premium $"
            className="input flex-1"
          />
          <input
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            inputMode="numeric"
            placeholder="Payout $"
            className="input flex-1"
          />
          <button onClick={submit} className="btn-primary px-4 text-sm">
            Add
          </button>
        </div>
      </div>
    </section>
  );
}
