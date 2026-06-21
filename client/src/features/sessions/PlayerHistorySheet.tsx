import { AuthImage } from "@/components/AuthImage";
import { money, formatTime, formatDuration } from "@/lib/format";
import type { PlayerGroup, PlayerSession } from "./api";

/**
 * Expanded view of a player's full history at this table — every check-in cycle
 * with its buy-ins and check-out — plus the relevant actions.
 */
export function PlayerHistorySheet({
  group,
  onBuyIn,
  onCheckout,
  onPayment,
  onCheckInAgain,
  onRemoveSession,
  onClose,
}: {
  group: PlayerGroup;
  onBuyIn: (s: PlayerSession) => void;
  onCheckout: (s: PlayerSession) => void;
  onPayment: (s: PlayerSession) => void;
  onCheckInAgain: () => void;
  onRemoveSession: (id: string) => void;
  onClose: () => void;
}) {
  const latest = group.sessions[group.sessions.length - 1];

  function entryLabel(e: PlayerSession["entries"][number]): string {
    switch (e.type) {
      case "buy_in":
        return "Buy-in";
      case "reimbursement":
        return `Reimburse${e.category ? ` (${e.category})` : ""}`;
      case "payment":
        return e.category === "received" ? "Received from" : "Sent to";
      default:
        return e.type;
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-slate-900/40" onClick={onClose}>
      <div
        className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <AuthImage
            photoId={group.player.photoId}
            alt={group.player.name}
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="flex-1">
            <div className="font-semibold">{group.player.name}</div>
            <div className="text-xs text-slate-500">
              {money(group.totalBuyIn)} bought in ·{" "}
              {group.hasActive
                ? "in play"
                : `net ${money(group.netSoFar)}`}
            </div>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500">
            Done
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pb-2">
          {group.active ? (
            <>
              <button
                onClick={() => onBuyIn(group.active!)}
                className="btn-ghost flex-1 text-sm"
              >
                + Buy-in
              </button>
              <button
                onClick={() => onCheckout(group.active!)}
                className="btn-primary flex-1 text-sm"
              >
                Check out
              </button>
            </>
          ) : (
            <>
              <button onClick={onCheckInAgain} className="btn-primary flex-1 text-sm">
                Check in again
              </button>
              <button
                onClick={() => onCheckout(latest)}
                className="btn-ghost flex-1 text-sm"
              >
                Edit last check-out
              </button>
            </>
          )}
        </div>

        <div className="px-4 pb-2">
          <button
            onClick={() => onPayment(group.active ?? latest)}
            className="btn-ghost w-full text-sm"
          >
            Record payment (sent / received)
          </button>
        </div>

        {/* History (scrollable) */}
        <div
          className="flex-1 space-y-3 overflow-y-auto p-4 pt-2"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <div className="label">History</div>
          {group.sessions.map((s, i) => (
            <div key={s.id} className="rounded-xl bg-slate-100 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">
                  Visit {i + 1}
                  <span className="ml-2 font-normal text-slate-400">
                    {formatDuration(s.checkinAt, s.checkoutAt ?? undefined)}
                  </span>
                </span>
                <button
                  onClick={() => onRemoveSession(s.id)}
                  className="text-slate-400"
                  aria-label="Remove visit"
                >
                  ✕
                </button>
              </div>
              <ul className="space-y-0.5 text-slate-600">
                <li className="text-slate-400">
                  Checked in · {formatTime(s.checkinAt)}
                </li>
                {s.entries.map((e) => (
                  <li key={e.id} className="flex justify-between">
                    <span className={e.type === "payment" ? "text-violet-600" : ""}>
                      {entryLabel(e)} · {formatTime(e.occurredAt)}
                    </span>
                    <span className={e.type === "payment" ? "text-violet-600" : ""}>
                      {money(e.amount)}
                    </span>
                  </li>
                ))}
                {s.status === "checked_out" ? (
                  <li className="flex justify-between border-t border-slate-200 pt-1 text-slate-700">
                    <span>
                      Checked out · {formatTime(s.checkoutAt ?? s.checkinAt)} ·
                      chips {money(Number(s.chipsOut ?? 0))}
                    </span>
                    {s.net !== null && (
                      <span
                        className={
                          s.net >= 0 ? "text-emerald-600" : "text-red-500"
                        }
                      >
                        {money(s.net)}
                      </span>
                    )}
                  </li>
                ) : (
                  <li className="text-emerald-600">Active</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
