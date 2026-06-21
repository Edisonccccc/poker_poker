import { useState, type ChangeEvent } from "react";
import { useAddTable } from "./hooks";
import { uploadPhoto } from "@/lib/api";
import { fileToDownscaledDataUrl } from "@/lib/image";
import { gameTypeLabel } from "@/lib/format";
import type { GameType } from "./api";

interface DenomDraft {
  color: string;
  value: string;
  dataUrl: string | null;
}

const TYPES: GameType[] = ["texas_holdem", "blackjack"];

export function AddTableSheet({
  gameId,
  onClose,
}: {
  gameId: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<GameType>("texas_holdem");
  const [stakes, setStakes] = useState("");
  const [label, setLabel] = useState("");
  const [denoms, setDenoms] = useState<DenomDraft[]>([
    { color: "", value: "", dataUrl: null },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = useAddTable(gameId);

  function patchDenom(i: number, patch: Partial<DenomDraft>) {
    setDenoms((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function onRowFile(i: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      patchDenom(i, { dataUrl: await fileToDownscaledDataUrl(file) });
    } catch {
      setError("Couldn't read that image.");
    }
  }

  async function save() {
    const clean = denoms.filter((d) => d.color.trim() && d.value !== "");
    if (clean.length === 0) {
      setError("Add at least one chip denomination.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const denominations = [];
      for (const d of clean) {
        const refPhotoId = d.dataUrl ? await uploadPhoto(d.dataUrl) : null;
        denominations.push({
          color: d.color.trim(),
          value: Number(d.value),
          refPhotoId,
        });
      }
      await add.mutateAsync({
        type,
        stakes: stakes.trim() || null,
        label: label.trim() || null,
        denominations,
      });
      onClose();
    } catch (e) {
      setError("Couldn't add the table.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-felt-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-white/60">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Add table</h2>
          <button
            onClick={save}
            disabled={busy}
            className="text-sm font-semibold text-emerald-400 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            Game type
          </span>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`min-h-tap flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  type === t ? "bg-felt-light" : "bg-white/10 text-white/60"
                }`}
              >
                {gameTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            Stakes (optional)
          </span>
          <input
            value={stakes}
            onChange={(e) => setStakes(e.target.value)}
            placeholder="e.g. 1/3"
            className="input"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            Label (optional)
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Main table"
            className="input"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            Chip denominations
          </span>
          {denoms.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={d.color}
                onChange={(e) => patchDenom(i, { color: e.target.value })}
                placeholder="Color"
                className="input flex-1"
              />
              <input
                value={d.value}
                onChange={(e) => patchDenom(i, { value: e.target.value })}
                placeholder="Value"
                inputMode="numeric"
                className="input w-24"
              />
              <label className="relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-white/10 text-xs text-white/60">
                {d.dataUrl ? (
                  <img
                    src={d.dataUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "📷"
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onRowFile(i, e)}
                  className="hidden"
                />
              </label>
              {denoms.length > 1 && (
                <button
                  onClick={() =>
                    setDenoms((rows) => rows.filter((_, j) => j !== i))
                  }
                  className="px-1 text-white/40"
                  aria-label="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() =>
              setDenoms((rows) => [...rows, { color: "", value: "", dataUrl: null }])
            }
            className="min-h-tap w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/80"
          >
            + Add color
          </button>
        </div>

        {error && <p className="text-sm text-amber-400">{error}</p>}
      </div>
    </div>
  );
}
