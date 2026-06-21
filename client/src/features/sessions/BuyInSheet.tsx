import { useState } from "react";
import { NumberPad } from "@/components/NumberPad";
import { money } from "@/lib/format";

/** Enter a buy-in amount on a number pad. */
export function BuyInSheet({
  playerName,
  onSubmit,
  onClose,
  busy,
}: {
  playerName: string;
  onSubmit: (amount: number) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [amount, setAmount] = useState("");
  const valid = Number(amount) > 0;

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Buy-in</h2>
          <button
            onClick={() => valid && onSubmit(Number(amount))}
            disabled={!valid || busy}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-40"
          >
            Add
          </button>
        </header>

        <p className="text-sm text-slate-500">{playerName}</p>

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
