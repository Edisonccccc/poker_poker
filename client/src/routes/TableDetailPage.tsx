import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTable } from "@/features/games/hooks";
import {
  usePlayerSessions,
  useDealerSessions,
  useCheckInPlayer,
  useCheckInDealer,
  useAddBuyIn,
  useRemovePlayerSession,
  useRemoveDealerSession,
} from "@/features/sessions/hooks";
import type { PlayerSession, DealerSession } from "@/features/sessions/api";
import { CheckInSheet } from "@/features/sessions/CheckInSheet";
import { BuyInSheet } from "@/features/sessions/BuyInSheet";
import { PlayerCheckoutSheet } from "@/features/checkout/PlayerCheckoutSheet";
import { DealerCheckoutSheet } from "@/features/checkout/DealerCheckoutSheet";
import { AuthImage } from "@/components/AuthImage";
import { StatusPill } from "./GamesPage";
import { gameTypeLabel, money, formatDuration } from "@/lib/format";

export function TableDetailPage() {
  const { id } = useParams();
  const tableId = id!;
  const { data: table, isLoading } = useTable(tableId);
  const players = usePlayerSessions(tableId);
  const dealers = useDealerSessions(tableId);

  const checkInPlayer = useCheckInPlayer(tableId);
  const checkInDealer = useCheckInDealer(tableId);
  const addBuyIn = useAddBuyIn(tableId);
  const removePlayer = useRemovePlayerSession(tableId);
  const removeDealer = useRemoveDealerSession(tableId);

  const [checkin, setCheckin] = useState<"players" | "dealers" | null>(null);
  const [buyInFor, setBuyInFor] = useState<PlayerSession | null>(null);
  const [checkoutPlayer, setCheckoutPlayer] = useState<PlayerSession | null>(null);
  const [checkoutDealer, setCheckoutDealer] = useState<DealerSession | null>(null);

  if (isLoading || !table)
    return <p className="text-sm text-white/50">Loading…</p>;

  return (
    <div className="space-y-5">
      <Link to={`/games/${table.gameId}`} className="text-sm text-white/55">
        ← Game
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {gameTypeLabel(table.type)}
            {table.stakes ? ` ${table.stakes}` : ""}
          </h1>
          {table.label && <p className="text-sm text-white/55">{table.label}</p>}
        </div>
        <StatusPill status={table.status} />
      </header>

      {/* Players */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Players
          </h2>
          <button
            onClick={() => setCheckin("players")}
            className="rounded-lg bg-felt-light px-3 py-1.5 text-sm font-semibold"
          >
            Check in
          </button>
        </div>
        {players.data && players.data.length > 0 ? (
          <ul className="space-y-2">
            {players.data.map((s) => (
              <PlayerRow
                key={s.id}
                session={s}
                onBuyIn={() => setBuyInFor(s)}
                onCheckout={() => setCheckoutPlayer(s)}
                onRemove={() => {
                  if (confirm(`Remove ${s.player.name} from this table?`))
                    removePlayer.mutate(s.id);
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50">No players checked in.</p>
        )}
      </section>

      {/* Dealers */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Dealers
          </h2>
          <button
            onClick={() => setCheckin("dealers")}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold"
          >
            Check in
          </button>
        </div>
        {dealers.data && dealers.data.length > 0 ? (
          <ul className="space-y-2">
            {dealers.data.map((s) => (
              <DealerRow
                key={s.id}
                session={s}
                onCheckout={() => setCheckoutDealer(s)}
                onRemove={() => {
                  if (confirm(`Remove ${s.dealer.name} from this table?`))
                    removeDealer.mutate(s.id);
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50">No dealers checked in.</p>
        )}
      </section>

      {/* Chips reference */}
      <details className="rounded-2xl bg-white/5 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white/70">
          Chips ({table.denominations.length})
        </summary>
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {table.denominations.map((d) => (
            <li key={d.id} className="text-center">
              <AuthImage
                photoId={d.refPhotoId}
                alt={d.color}
                className="mb-1 aspect-square w-full rounded-xl object-cover"
              />
              <div className="text-sm font-semibold">{money(d.value)}</div>
              <div className="truncate text-xs text-white/55">{d.color}</div>
            </li>
          ))}
        </ul>
      </details>

      {checkin === "players" && (
        <CheckInSheet
          kind="players"
          busy={checkInPlayer.isPending}
          onClose={() => setCheckin(null)}
          onPick={(profileId) =>
            checkInPlayer.mutate(profileId, {
              onSuccess: () => setCheckin(null),
              onError: () => alert("That player may already be checked in."),
            })
          }
        />
      )}
      {checkin === "dealers" && (
        <CheckInSheet
          kind="dealers"
          busy={checkInDealer.isPending}
          onClose={() => setCheckin(null)}
          onPick={(profileId) =>
            checkInDealer.mutate(profileId, {
              onSuccess: () => setCheckin(null),
              onError: () => alert("That dealer may already be checked in."),
            })
          }
        />
      )}
      {buyInFor && (
        <BuyInSheet
          playerName={buyInFor.player.name}
          busy={addBuyIn.isPending}
          onClose={() => setBuyInFor(null)}
          onSubmit={(amount) =>
            addBuyIn.mutate(
              { sessionId: buyInFor.id, amount },
              { onSuccess: () => setBuyInFor(null) },
            )
          }
        />
      )}
      {checkoutPlayer && (
        <PlayerCheckoutSheet
          tableId={tableId}
          session={checkoutPlayer}
          onClose={() => setCheckoutPlayer(null)}
        />
      )}
      {checkoutDealer && (
        <DealerCheckoutSheet
          tableId={tableId}
          session={checkoutDealer}
          onClose={() => setCheckoutDealer(null)}
        />
      )}
    </div>
  );
}

function PlayerRow({
  session,
  onBuyIn,
  onCheckout,
  onRemove,
}: {
  session: PlayerSession;
  onBuyIn: () => void;
  onCheckout: () => void;
  onRemove: () => void;
}) {
  const active = session.status === "active";
  return (
    <li className="space-y-2 rounded-2xl bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <AuthImage
          photoId={session.player.photoId}
          alt={session.player.name}
          className="h-11 w-11 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{session.player.name}</div>
          <div className="text-xs text-white/55">
            {money(session.buyInTotal)} in ·{" "}
            {formatDuration(session.checkinAt, session.checkoutAt ?? undefined)}
            {!active && session.net !== null && (
              <>
                {" · "}
                <span
                  className={session.net >= 0 ? "text-emerald-400" : "text-red-400"}
                >
                  net {money(session.net)}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="px-1 text-white/40"
          aria-label="Remove"
        >
          ✕
        </button>
      </div>
      {active ? (
        <div className="flex gap-2">
          <button
            onClick={onBuyIn}
            className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold"
          >
            + Buy-in
          </button>
          <button
            onClick={onCheckout}
            className="flex-1 rounded-lg bg-felt-light py-2 text-sm font-semibold"
          >
            Check out
          </button>
        </div>
      ) : (
        <button
          onClick={onCheckout}
          className="w-full rounded-lg bg-white/10 py-2 text-sm font-semibold text-white/70"
        >
          Edit check-out
        </button>
      )}
    </li>
  );
}

function DealerRow({
  session,
  onCheckout,
  onRemove,
}: {
  session: DealerSession;
  onCheckout: () => void;
  onRemove: () => void;
}) {
  const active = session.status === "active";
  return (
    <li className="space-y-2 rounded-2xl bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <AuthImage
          photoId={session.dealer.photoId}
          alt={session.dealer.name}
          className="h-11 w-11 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{session.dealer.name}</div>
          <div className="text-xs text-white/55">
            {formatDuration(session.checkinAt, session.checkoutAt ?? undefined)}
            {session.tipsTotal !== null && ` · tips ${money(session.tipsTotal)}`}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="px-1 text-white/40"
          aria-label="Remove"
        >
          ✕
        </button>
      </div>
      <button
        onClick={onCheckout}
        className="w-full rounded-lg bg-felt-light py-2 text-sm font-semibold"
      >
        {active ? "Check out (tips)" : "Edit tips"}
      </button>
    </li>
  );
}
