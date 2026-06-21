import { useState } from "react";
import {
  useSettlement,
  useAddHostCost,
  useDeleteHostCost,
  useAddOtherParty,
  useDeleteOtherParty,
} from "./hooks";
import { money } from "@/lib/format";

const COST_CATEGORIES = ["rent", "food", "other"];

export function AfterGamePanel({ gameId }: { gameId: string }) {
  const { data, isLoading, isError } = useSettlement(gameId);

  if (isLoading) return <p className="text-sm text-white/50">Loading…</p>;
  if (isError || !data)
    return <p className="text-sm text-amber-400">Couldn't load settlement.</p>;

  const t = data.totals;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <section className="rounded-2xl bg-white/5 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
          Host summary
        </h3>
        <Row label="Cash in (buy-ins)" value={t.cashIn} />
        <Row label="Player cash-outs" value={-t.playerPayout} />
        <Row label="Dealer tips" value={-t.dealerPayout} />
        <Row label="Reimbursements" value={-t.reimbursements} />
        <div className="my-2 border-t border-white/10" />
        <Row label="Host take" value={t.hostTake} bold />
        <Row label="Host costs" value={-t.hostCosts} />
        <div className="my-2 border-t border-white/10" />
        <Row label="Host net" value={t.hostNet} bold big />
      </section>

      {/* Host costs */}
      <HostCosts gameId={gameId} costs={data.hostCosts} />

      {/* Players */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
          Players
        </h3>
        {data.players.length === 0 ? (
          <p className="text-sm text-white/50">No players.</p>
        ) : (
          <ul className="space-y-1">
            {data.players.map((p) => (
              <li
                key={p.sessionId}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <span className="truncate">{p.player.name}</span>
                {p.net === null ? (
                  <span className="text-white/40">in play</span>
                ) : (
                  <span
                    className={p.net >= 0 ? "text-emerald-400" : "text-red-400"}
                  >
                    {money(p.net)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dealers */}
      {data.dealers.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Dealers
          </h3>
          <ul className="space-y-1">
            {data.dealers.map((d) => (
              <li
                key={d.sessionId}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <span className="truncate">{d.dealer.name}</span>
                <span className="text-white/70">
                  {d.tipsTotal === null ? "—" : `${money(d.tipsTotal)} tips`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Other parties */}
      <OtherParties gameId={gameId} others={data.others} />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  big,
}: {
  label: string;
  value: number;
  bold?: boolean;
  big?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm ${bold ? "text-white" : "text-white/60"}`}>
        {label}
      </span>
      <span
        className={`${big ? "text-xl" : "text-sm"} ${
          bold ? "font-bold" : ""
        } ${value < 0 ? "text-red-400" : bold ? "text-emerald-400" : "text-white/80"}`}
      >
        {money(value)}
      </span>
    </div>
  );
}

function HostCosts({
  gameId,
  costs,
}: {
  gameId: string;
  costs: { id: string; category: string; amount: number; note: string | null }[];
}) {
  const [category, setCategory] = useState("rent");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const add = useAddHostCost(gameId);
  const del = useDeleteHostCost(gameId);

  function submit() {
    if (!(Number(amount) > 0)) return;
    add.mutate(
      { category, amount: Number(amount), note: note.trim() || null },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
        },
      },
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
        Host costs
      </h3>
      {costs.length > 0 && (
        <ul className="space-y-1">
          {costs.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
            >
              <span className="truncate capitalize">
                {c.category}
                {c.note ? ` · ${c.note}` : ""}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-white/80">{money(c.amount)}</span>
                <button
                  onClick={() => del.mutate(c.id)}
                  className="text-white/40"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        {COST_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
              category === c ? "bg-felt-light" : "bg-white/10 text-white/60"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="input flex-1"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="$"
          className="input w-24"
        />
        <button
          onClick={submit}
          className="rounded-xl bg-felt-light px-4 text-sm font-semibold"
        >
          Add
        </button>
      </div>
    </section>
  );
}

function OtherParties({
  gameId,
  others,
}: {
  gameId: string;
  others: { id: string; label: string; net: number; note: string | null }[];
}) {
  const [label, setLabel] = useState("");
  const [net, setNet] = useState("");
  const add = useAddOtherParty(gameId);
  const del = useDeleteOtherParty(gameId);

  function submit() {
    if (!label.trim() || net === "") return;
    add.mutate(
      { label: label.trim(), net: Number(net) },
      {
        onSuccess: () => {
          setLabel("");
          setNet("");
        },
      },
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
        Other parties
      </h3>
      {others.length > 0 && (
        <ul className="space-y-1">
          {others.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
            >
              <span className="truncate">{o.label}</span>
              <span className="flex items-center gap-3">
                <span className={o.net >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {money(o.net)}
                </span>
                <button
                  onClick={() => del.mutate(o.id)}
                  className="text-white/40"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name / label"
          className="input flex-1"
        />
        <input
          value={net}
          onChange={(e) => setNet(e.target.value)}
          inputMode="numeric"
          placeholder="net $"
          className="input w-24"
        />
        <button
          onClick={submit}
          className="rounded-xl bg-felt-light px-4 text-sm font-semibold"
        >
          Add
        </button>
      </div>
    </section>
  );
}
