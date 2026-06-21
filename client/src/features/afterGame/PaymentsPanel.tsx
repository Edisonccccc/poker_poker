import { useState } from "react";
import { useSettlement, useRecordPayment } from "./hooks";
import { PaymentSheet } from "@/features/sessions/PaymentSheet";
import { AuthImage } from "@/components/AuthImage";
import { money } from "@/lib/format";

interface PlayerAgg {
  playerId: string;
  name: string;
  photoId: string | null;
  sessionId: string; // latest session, used to attach a payment
  net: number; // owed to player (host pays if +, collects if −)
  paid: number; // already settled (sent − received)
  pending: boolean; // a visit is still in play
}

/**
 * Session-level payment tracker: every player with what they're owed / owe,
 * how much is settled, and the remaining balance. Aggregates across all tables.
 */
export function PaymentsPanel({ gameId }: { gameId: string }) {
  const { data, isLoading, isError } = useSettlement(gameId);
  const record = useRecordPayment(gameId);
  const [payFor, setPayFor] = useState<PlayerAgg | null>(null);

  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (isError || !data)
    return <p className="text-sm text-amber-600">Couldn't load payments.</p>;

  const byPlayer = new Map<string, PlayerAgg>();
  for (const p of data.players) {
    let a = byPlayer.get(p.player.id);
    if (!a) {
      a = {
        playerId: p.player.id,
        name: p.player.name,
        photoId: p.player.photoId,
        sessionId: p.sessionId,
        net: 0,
        paid: 0,
        pending: false,
      };
      byPlayer.set(p.player.id, a);
    }
    a.sessionId = p.sessionId; // keep latest
    a.paid += p.paid;
    if (p.net === null) a.pending = true;
    else a.net += p.net;
  }
  const rows = [...byPlayer.values()].sort((a, b) => b.net - a.net);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        What each player is owed or owes across this session, and what's settled.
      </p>

      {rows.length === 0 && (
        <p className="text-sm text-slate-400">No players yet.</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => {
          const balance = r.net - r.paid; // host still owes player if +
          const settled = !r.pending && Math.abs(balance) < 0.005;
          return (
            <li key={r.playerId} className="card flex items-center gap-3">
              <AuthImage
                photoId={r.photoId}
                alt={r.name}
                fallback="avatar"
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name}</div>
                <div className="text-xs text-slate-500">
                  {r.pending
                    ? "still in play"
                    : r.net >= 0
                      ? `receives ${money(r.net)}`
                      : `owes ${money(-r.net)}`}
                  {r.paid !== 0 && ` · settled ${money(r.paid)}`}
                </div>
              </div>
              {settled ? (
                <span className="pill bg-emerald-100 text-emerald-700">
                  settled
                </span>
              ) : (
                <div className="text-right">
                  <div
                    className={`text-sm font-semibold ${
                      balance >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {money(balance)}
                  </div>
                  <button
                    onClick={() => setPayFor(r)}
                    className="text-xs font-semibold text-violet-600"
                  >
                    Record
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {payFor && (
        <PaymentSheet
          playerName={payFor.name}
          busy={record.isPending}
          onClose={() => setPayFor(null)}
          onSubmit={(direction, amount) =>
            record.mutate(
              { sessionId: payFor.sessionId, direction, amount },
              { onSuccess: () => setPayFor(null) },
            )
          }
        />
      )}
    </div>
  );
}
