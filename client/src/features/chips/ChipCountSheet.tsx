import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { uploadPhoto } from "@/lib/api";
import { countChips, type PerColor } from "./api";
import { money } from "@/lib/format";

type Phase = "capture" | "counting" | "review" | "error";

/**
 * Take a photo of a chip stack, count it with the vision model, then let the
 * host review/edit per-color counts before using the total. Manual entry remains
 * available on the parent sheet if this fails.
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
  const [phase, setPhase] = useState<Phase>("capture");
  const [rows, setRows] = useState<PerColor[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onCapture(dataUrl: string) {
    setPhase("counting");
    setError(null);
    try {
      const photoId = await uploadPhoto(dataUrl);
      const result = await countChips(tableId, photoId);
      setRows(result.perColor);
      setPhase("review");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("503")) {
        setError(
          "Photo counting isn't set up on the server (check VISION_API_KEY and restart).",
        );
      } else {
        // Surface the server's detail so vision/API problems are diagnosable.
        const detail = msg.replace(/^API \d+:\s*/, "");
        setError(`Couldn't count: ${detail || "unknown error"}. Enter manually.`);
      }
      setPhase("error");
    }
  }

  const total = rows.reduce((a, r) => a + (Number(r.count) || 0) * r.value, 0);

  function setCount(i: number, count: number) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, count } : r)));
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-felt-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-white/60">
            Cancel
          </button>
          <h2 className="text-base font-semibold">{title}</h2>
          {phase === "review" ? (
            <button
              onClick={() => onUse(total)}
              className="text-sm font-semibold text-emerald-400"
            >
              Use {money(total)}
            </button>
          ) : (
            <span className="w-16" />
          )}
        </header>

        {(phase === "capture" || phase === "error") && (
          <>
            {error && <p className="text-sm text-amber-400">{error}</p>}
            <p className="text-sm text-white/55">
              Spread the chips out and take a clear top-down photo.
            </p>
            <CameraCapture onCapture={onCapture} facingMode="environment" />
          </>
        )}

        {phase === "counting" && (
          <p className="py-10 text-center text-sm text-white/60">Counting…</p>
        )}

        {phase === "review" && (
          <>
            <p className="text-sm text-white/55">
              Check the counts and fix any that look off.
            </p>
            <ul className="space-y-2">
              {rows.map((r, i) => (
                <li
                  key={r.color}
                  className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
                >
                  <span className="flex-1 capitalize">
                    {r.color}{" "}
                    <span className="text-white/45">({money(r.value)})</span>
                  </span>
                  <input
                    value={String(r.count)}
                    onChange={(e) => setCount(i, Number(e.target.value) || 0)}
                    inputMode="numeric"
                    className="input w-20 text-center"
                  />
                  <span className="w-20 text-right text-white/70">
                    {money((Number(r.count) || 0) * r.value)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <div className="text-sm text-white/55">Total</div>
              <div className="text-3xl font-bold">{money(total)}</div>
            </div>
            <button
              onClick={() => setPhase("capture")}
              className="min-h-tap w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/70"
            >
              Retake photo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
