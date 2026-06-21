import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { useTable } from "@/features/games/hooks";
import type { Denomination } from "@/features/games/api";
import { estimateStackCount } from "@/lib/chipCount";
import { money } from "@/lib/format";

/**
 * Per-color counting. List each chip color; enter a count manually or tap 📷 to
 * photograph that color's stack and auto-estimate it (deterministic, in-browser).
 * The estimate pre-fills an editable field — manual is always the source of truth.
 */
export function ChipCountSheet({
  tableId,
  title,
  onUse,
  onClose,
}: {
  tableId: string;
  title: string;
  onUse: (total: number) => void;
  onClose: () => void;
}) {
  const { data: table, isLoading } = useTable(tableId);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [captureFor, setCaptureFor] = useState<Denomination | null>(null);
  const [estimating, setEstimating] = useState(false);

  const denoms = table?.denominations ?? [];
  const total = denoms.reduce(
    (a, d) => a + (counts[d.id] || 0) * Number(d.value),
    0,
  );

  async function onCapture(dataUrl: string) {
    if (!captureFor) return;
    setEstimating(true);
    try {
      const { count } = await estimateStackCount(dataUrl);
      setCounts((c) => ({ ...c, [captureFor.id]: count }));
    } catch {
      // leave the count as-is; host can type it
    } finally {
      setEstimating(false);
      setCaptureFor(null);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-felt-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-white/60">
            Cancel
          </button>
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={() => onUse(total)}
            className="text-sm font-semibold text-emerald-400"
          >
            Use {money(total)}
          </button>
        </header>

        {isLoading && <p className="text-sm text-white/50">Loading…</p>}

        <p className="text-sm text-white/55">
          Count each color separately. Tap 📷 to photograph one color's stack
          (stand it on its side, fill the frame) for an estimate, then fix the
          number if needed.
        </p>

        <ul className="space-y-2">
          {denoms.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
            >
              <span className="flex-1 capitalize">
                {d.color}{" "}
                <span className="text-white/45">({money(d.value)})</span>
              </span>
              <button
                onClick={() => setCaptureFor(d)}
                className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
                aria-label={`Count ${d.color}`}
              >
                📷
              </button>
              <input
                value={String(counts[d.id] ?? "")}
                onChange={(e) =>
                  setCounts((c) => ({ ...c, [d.id]: Number(e.target.value) || 0 }))
                }
                inputMode="numeric"
                placeholder="0"
                className="input w-16 text-center"
              />
              <span className="w-20 text-right text-white/70">
                {money((counts[d.id] || 0) * Number(d.value))}
              </span>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl bg-white/5 p-4 text-center">
          <div className="text-sm text-white/55">Total</div>
          <div className="text-3xl font-bold">{money(total)}</div>
        </div>
      </div>

      {captureFor && (
        <div className="fixed inset-0 z-40 flex flex-col bg-felt-dark">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
            <header className="flex items-center justify-between">
              <button
                onClick={() => setCaptureFor(null)}
                className="text-sm text-white/60"
              >
                Back
              </button>
              <h2 className="text-base font-semibold capitalize">
                Count {captureFor.color}
              </h2>
              <span className="w-12" />
            </header>
            {estimating ? (
              <p className="py-10 text-center text-sm text-white/60">
                Estimating…
              </p>
            ) : (
              <>
                <p className="text-sm text-white/55">
                  Stand the {captureFor.color} chips in one stack and fill the
                  frame top-to-bottom.
                </p>
                <CameraCapture
                  onCapture={onCapture}
                  facingMode="environment"
                  maxSize={1280}
                  quality={0.85}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
