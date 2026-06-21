import { useState, type ChangeEvent } from "react";
import { useAddTable } from "./hooks";
import { uploadPhoto } from "@/lib/api";
import { fileToDownscaledDataUrl } from "@/lib/image";
import { identifyChip } from "@/features/chips/api";
import { gameTypeLabel } from "@/lib/format";
import type { GameType } from "./api";

interface DenomDraft {
  color: string;
  value: string;
  photoUrl: string | null;
  photoId: string | null;
  scanning: boolean;
}

const emptyDenom = (): DenomDraft => ({
  color: "",
  value: "",
  photoUrl: null,
  photoId: null,
  scanning: false,
});

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
  const [denoms, setDenoms] = useState<DenomDraft[]>([emptyDenom()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = useAddTable(gameId);

  function patchDenom(i: number, patch: Partial<DenomDraft>) {
    setDenoms((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  // Photograph a chip → store as reference + auto-fill color & value.
  async function onScan(i: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      patchDenom(i, { photoUrl: dataUrl, scanning: true });
      const photoId = await uploadPhoto(dataUrl);
      patchDenom(i, { photoId });
      try {
        const id = await identifyChip(photoId);
        patchDenom(i, {
          color: id.color || "",
          value: id.value != null ? String(id.value) : "",
          scanning: false,
        });
      } catch {
        patchDenom(i, { scanning: false });
      }
    } catch {
      patchDenom(i, { scanning: false });
      setError("Couldn't read that image.");
    }
  }

  async function save() {
    const clean = denoms.filter((d) => d.color.trim() && d.value !== "");
    if (clean.length === 0) {
      setError("Add at least one chip color.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const denominations = [];
      for (const d of clean) {
        const refPhotoId =
          d.photoId ?? (d.photoUrl ? await uploadPhoto(d.photoUrl) : null);
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
    <div className="sheet">
      <div className="sheet-body">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Add table</h2>
          <button
            onClick={save}
            disabled={busy}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <div className="space-y-1">
          <span className="label">Game type</span>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`min-h-tap flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  type === t ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {gameTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="label">Stakes (optional)</span>
          <input
            value={stakes}
            onChange={(e) => setStakes(e.target.value)}
            placeholder="e.g. 1/3"
            className="input"
          />
        </label>

        <label className="block space-y-1">
          <span className="label">Label (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Main table"
            className="input"
          />
        </label>

        <div className="space-y-3">
          <span className="label">Chip colors</span>
          <p className="text-xs text-slate-400">
            Tap 📷 to scan a chip — it auto-fills the color &amp; value.
          </p>
          {denoms.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <label className="relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs text-slate-500">
                {d.scanning ? (
                  "…"
                ) : d.photoUrl ? (
                  <img
                    src={d.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "📷"
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => onScan(i, e)}
                  className="hidden"
                />
              </label>
              <input
                value={d.color}
                onChange={(e) => patchDenom(i, { color: e.target.value })}
                placeholder="Color"
                className="input flex-1"
              />
              <input
                value={d.value}
                onChange={(e) => patchDenom(i, { value: e.target.value })}
                placeholder="$"
                inputMode="numeric"
                className="input w-20"
              />
              {denoms.length > 1 && (
                <button
                  onClick={() =>
                    setDenoms((rows) => rows.filter((_, j) => j !== i))
                  }
                  className="px-1 text-slate-400"
                  aria-label="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setDenoms((rows) => [...rows, emptyDenom()])}
            className="btn-ghost w-full text-sm"
          >
            + Add color
          </button>
        </div>

        {error && <p className="text-sm text-amber-600">{error}</p>}
      </div>
    </div>
  );
}
