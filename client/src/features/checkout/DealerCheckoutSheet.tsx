import { useState } from "react";
import { NumberPad } from "@/components/NumberPad";
import { ChipCountSheet } from "@/features/chips/ChipCountSheet";
import { useCheckoutDealer } from "./hooks";
import type { DealerSession } from "@/features/sessions/api";
import { money } from "@/lib/format";

export function DealerCheckoutSheet({
  tableId,
  session,
  onClose,
}: {
  tableId: string;
  session: DealerSession;
  onClose: () => void;
}) {
  const [tips, setTips] = useState(
    session.tipsTotal !== null ? String(session.tipsTotal) : "",
  );
  const [counting, setCounting] = useState(false);
  const checkout = useCheckoutDealer(tableId);

  async function save() {
    await checkout.mutateAsync({
      sessionId: session.id,
      tipsTotal: Number(tips) || 0,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-felt-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-white/60">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Dealer tips</h2>
          <button
            onClick={save}
            disabled={checkout.isPending}
            className="text-sm font-semibold text-emerald-400 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <p className="text-sm text-white/55">{session.dealer.name}</p>

        <div className="rounded-2xl bg-white/5 py-8 text-center text-5xl font-bold">
          {tips ? money(tips) : <span className="text-white/30">$0</span>}
        </div>

        <button
          onClick={() => setCounting(true)}
          className="min-h-tap w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold"
        >
          📷 Count from photo
        </button>

        <div className="mt-auto">
          <NumberPad value={tips} onChange={setTips} />
        </div>
      </div>

      {counting && (
        <ChipCountSheet
          tableId={tableId}
          title="Count tips"
          onUse={(total) => {
            setTips(String(total));
            setCounting(false);
          }}
          onClose={() => setCounting(false)}
        />
      )}
    </div>
  );
}

