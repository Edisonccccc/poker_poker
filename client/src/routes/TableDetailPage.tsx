import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useTable, useDeleteTable } from "@/features/games/hooks";
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
import { PokerTable } from "@/components/PokerTable";
import { AuthImage } from "@/components/AuthImage";
import { StatusPill } from "./GamesPage";
import { gameTypeLabel, money, formatDuration } from "@/lib/format";

export function TableDetailPage() {
  const { id } = useParams();
  const tableId = id!;
  const navigate = useNavigate();
  const { data: table, isLoading } = useTable(tableId);
  const players = usePlayerSessions(tableId);
  const dealers = useDealerSessions(tableId);

  const checkInPlayer = useCheckInPlayer(tableId);
  const checkInDealer = useCheckInDealer(tableId);
  const addBuyIn = useAddBuyIn(tableId);
  const removePlayer = useRemovePlayerSession(tableId);
  const removeDealer = useRemoveDealerSession(tableId);
  const delTable = useDeleteTable(table?.gameId ?? "");

  const [checkin, setCheckin] = useState<"players" | "dealers" | null>(null);
  const [selected, setSelected] = useState<PlayerSession | null>(null);
  const [buyInFor, setBuyInFor] = useState<PlayerSession | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<PlayerSession | null>(null);
  const [dealerCheckout, setDealerCheckout] = useState<DealerSession | null>(null);

  if (isLoading || !table)
    return <p className="text-sm text-white/50">Loading…</p>;

  const stakesLabel = `${gameTypeLabel(table.type)}${
    table.stakes ? ` · ${table.stakes}` : ""
  }`;

  async function onDeleteTable() {
    if (!table) return;
    if (!confirm("Delete this table? Check-ins and buy-ins will be removed."))
      return;
    await delTable.mutateAsync(table.id);
    navigate(`/games/${table.gameId}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to={`/games/${table.gameId}`} className="text-sm text-white/55">
          ← Session
        </Link>
        <button
          onClick={onDeleteTable}
          className="text-white/40"
          aria-label="Delete table"
        >
          <Trash2 size={18} />
        </button>
      </div>

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

      <PokerTable
        players={players.data ?? []}
        centerLabel={stakesLabel}
        onSelect={setSelected}
      />

      <div className="flex gap-2">
        <button
          onClick={() => setCheckin("players")}
          className="btn-primary flex-1 text-sm"
        >
          + Player
        </button>
        <button
          onClick={() => setCheckin("dealers")}
          className="btn-ghost flex-1 text-sm"
        >
          + Dealer
        </button>
      </div>

      {/* Dealers */}
      {dealers.data && dealers.data.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Dealers</h2>
          <ul className="space-y-2">
            {dealers.data.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
              >
                <AuthImage
                  photoId={s.dealer.photoId}
                  alt={s.dealer.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.dealer.name}</div>
                  <div className="text-xs text-white/55">
                    {formatDuration(s.checkinAt, s.checkoutAt ?? undefined)}
                    {s.tipsTotal !== null && ` · ${money(s.tipsTotal)} tips`}
                  </div>
                </div>
                <button
                  onClick={() => setDealerCheckout(s)}
                  className="rounded-lg bg-felt-light px-3 py-1.5 text-sm font-semibold"
                >
                  {s.status === "active" ? "Tips" : "Edit"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${s.dealer.name}?`))
                      removeDealer.mutate(s.id);
                  }}
                  className="px-1 text-white/40"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Player action menu */}
      {selected && (
        <div
          className="fixed inset-0 z-20 flex items-end bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="mx-auto w-full max-w-md space-y-2 rounded-t-3xl bg-felt-dark p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-2">
              <AuthImage
                photoId={selected.player.photoId}
                alt={selected.player.name}
                className="h-11 w-11 rounded-full object-cover"
              />
              <div>
                <div className="font-semibold">{selected.player.name}</div>
                <div className="text-xs text-white/55">
                  {money(selected.buyInTotal)} in ·{" "}
                  {formatDuration(
                    selected.checkinAt,
                    selected.checkoutAt ?? undefined,
                  )}
                </div>
              </div>
            </div>
            {selected.status === "active" && (
              <button
                onClick={() => {
                  setBuyInFor(selected);
                  setSelected(null);
                }}
                className="btn-ghost w-full"
              >
                + Buy-in
              </button>
            )}
            <button
              onClick={() => {
                setCheckoutFor(selected);
                setSelected(null);
              }}
              className="btn-primary w-full"
            >
              {selected.status === "active" ? "Check out" : "Edit check-out"}
            </button>
            <button
              onClick={() => {
                const s = selected;
                setSelected(null);
                if (confirm(`Remove ${s.player.name} from this table?`))
                  removePlayer.mutate(s.id);
              }}
              className="btn w-full text-red-400"
            >
              Remove
            </button>
          </div>
        </div>
      )}

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
      {checkoutFor && (
        <PlayerCheckoutSheet
          tableId={tableId}
          session={checkoutFor}
          onClose={() => setCheckoutFor(null)}
        />
      )}
      {dealerCheckout && (
        <DealerCheckoutSheet
          tableId={tableId}
          session={dealerCheckout}
          onClose={() => setDealerCheckout(null)}
        />
      )}
    </div>
  );
}
