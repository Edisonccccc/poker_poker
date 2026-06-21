import { useState } from "react";
import { NumberPad } from "@/components/NumberPad";
import { money } from "@/lib/format";
import type { PaymentDirection } from "./api";

/** Record cash sent to / received from a player (like a buy-in, with direction). */
export function PaymentSheet({
  playerName,
  busy,
  onSubmit,
  onClose,
}: {
  playerName: string;
  busy?: boolean;
  onSubmit: (direction: PaymentDirection, amount: number) => void;
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<PaymentDirection>("sent");
  const [amount, setAmount] = useState("");
  const valid = Number(amount) > 0;

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Payment</h2>
          <button
            onClick={() => valid && onSubmit(direction, Number(amount))}
            disabled={!valid || busy}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-40"
          >
            Add
          </button>
        </header>

        <div className="flex rounded-xl bg-slate-100 p-1">
          {(
            [
              ["sent", `Sent to ${playerName}`],
              ["received", `Received from ${playerName}`],
            ] as const
          ).map(([dir, labelText]) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`min-h-tap flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                direction === dir ? "bg-violet-600 text-white" : "text-slate-500"
              }`}
            >
              {labelText}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-slate-100 py-8 text-center text-5xl font-bold">
          {amount ? money(amount) : <span className="text-slate-300">$0</span>}
        </div>

        <div className="mt-auto">
          <NumberPad value={amount} onChange={setAmount} />
        </div>
      </div>
    </div>
  );
}
