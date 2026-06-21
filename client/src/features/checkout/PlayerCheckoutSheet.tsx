import { useState } from "react";
import { useCheckoutPlayer } from "./hooks";
import type { PlayerSession } from "@/features/sessions/api";
import { money } from "@/lib/format";

/** ISO → value for <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function PlayerCheckoutSheet({
  tableId,
  session,
  onClose,
}: {
  tableId: string;
  session: PlayerSession;
  onClose: () => void;
}) {
  const buyIn = session.buyInTotal;
  const uberEntry = session.entries?.find(
    (e) => e.type === "reimbursement" && e.category === "uber",
  );

  const [chips, setChips] = useState(
    session.chipsOut !== null ? String(session.chipsOut) : "",
  );
  const [checkinLocal, setCheckinLocal] = useState(toLocalInput(session.checkinAt));
  const [checkoutLocal, setCheckoutLocal] = useState(
    toLocalInput(session.checkoutAt ?? new Date().toISOString()),
  );
  const [hourlyOn, setHourlyOn] = useState(session.hourlyReturn);
  const [hourlyRate, setHourlyRate] = useState(session.hourlyRate ?? "25");
  const [pctOn, setPctOn] = useState(session.pctRebate);
  const [pctRate, setPctRate] = useState(session.pctRate ?? "10");
  const [uberOn, setUberOn] = useState(!!uberEntry);
  const [uberAmount, setUberAmount] = useState(
    uberEntry ? String(uberEntry.amount) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const checkout = useCheckoutPlayer(tableId);

  const chipsN = Number(chips) || 0;
  const underWater = chips !== "" && chipsN < buyIn;
  const loss = Math.max(0, buyIn - chipsN);

  const rawHours =
    (new Date(checkoutLocal).getTime() - new Date(checkinLocal).getTime()) /
    3_600_000;
  const ceilHours = Number.isFinite(rawHours) ? Math.max(0, Math.ceil(rawHours)) : 0;
  const hourlyAmt = hourlyOn ? (Number(hourlyRate) || 0) * ceilHours : 0;
  const pctAmt =
    pctOn && underWater
      ? Math.round(((Number(pctRate) || 0) / 100) * loss * 100) / 100
      : 0;
  const uberAmt = uberOn ? Number(uberAmount) || 0 : 0;
  const net = chipsN - buyIn + hourlyAmt + pctAmt + uberAmt;

  async function save() {
    if (chips === "") {
      setError("Enter the player's chip count.");
      return;
    }
    setError(null);
    try {
      await checkout.mutateAsync({
        sessionId: session.id,
        chipsOut: chipsN,
        reimbursements: uberAmt > 0 ? [{ category: "uber", amount: uberAmt }] : [],
        hourlyReturn: hourlyOn,
        hourlyRate: Number(hourlyRate) || 0,
        pctRebate: pctOn,
        pctRate: Number(pctRate) || 0,
        checkinAt: new Date(checkinLocal).toISOString(),
        checkoutAt: new Date(checkoutLocal).toISOString(),
      });
      onClose();
    } catch (e) {
      setError("Couldn't check out.");
      console.error(e);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">Check out</h2>
          <button
            onClick={save}
            disabled={checkout.isPending}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <p className="text-sm text-slate-500">
          {session.player.name} · {money(buyIn)} bought in
        </p>

        <label className="block space-y-1">
          <span className="label">Chip count (cash out)</span>
          <input
            value={chips}
            onChange={(e) => setChips(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className="input"
          />
        </label>

        <div className="space-y-1">
          <span className="label">Time at table</span>
          <div className="flex gap-2">
            <label className="flex-1 space-y-1">
              <span className="text-xs text-slate-500">Check-in</span>
              <input
                type="datetime-local"
                value={checkinLocal}
                onChange={(e) => setCheckinLocal(e.target.value)}
                className="input"
              />
            </label>
            <label className="flex-1 space-y-1">
              <span className="text-xs text-slate-500">Check-out</span>
              <input
                type="datetime-local"
                value={checkoutLocal}
                onChange={(e) => setCheckoutLocal(e.target.value)}
                className="input"
              />
            </label>
          </div>
        </div>

        {/* Rebates & reimbursements */}
        <div className="space-y-2">
          <span className="label">Rebates & reimbursements</span>

          <RebateRow
            label="Hourly rebate"
            hint={`${ceilHours}h, rounded up`}
            checked={hourlyOn}
            onToggle={setHourlyOn}
            amount={hourlyAmt}
          >
            <RateField
              prefix="$/hr"
              value={hourlyRate}
              onChange={setHourlyRate}
            />
          </RebateRow>

          <RebateRow
            label="Percentage rebate"
            hint={underWater ? `of ${money(loss)} loss` : "only when under water"}
            checked={pctOn}
            disabled={!underWater}
            onToggle={setPctOn}
            amount={pctAmt}
          >
            <RateField prefix="%" value={pctRate} onChange={setPctRate} />
          </RebateRow>

          <RebateRow
            label="Uber"
            checked={uberOn}
            onToggle={setUberOn}
            amount={uberAmt}
          >
            <RateField
              prefix="$"
              value={uberAmount}
              onChange={setUberAmount}
              placeholder="amount"
            />
          </RebateRow>
        </div>

        <div className="rounded-2xl bg-violet-50 p-4">
          <div className="text-sm text-slate-500">Net (paid to player)</div>
          <div
            className={`text-3xl font-bold ${
              net >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {money(net)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            chips {money(chipsN)} − buy-ins {money(buyIn)}
            {hourlyAmt ? ` + hourly ${money(hourlyAmt)}` : ""}
            {pctAmt ? ` + ${pctRate}% ${money(pctAmt)}` : ""}
            {uberAmt ? ` + uber ${money(uberAmt)}` : ""}
          </p>
        </div>

        {error && <p className="text-sm text-amber-600">{error}</p>}
      </div>
    </div>
  );
}

function RebateRow({
  label,
  hint,
  checked,
  disabled,
  onToggle,
  amount,
  children,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
  amount: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        checked ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-white"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <label className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {label}{" "}
          {hint && <span className="text-xs text-slate-400">({hint})</span>}
        </span>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5 accent-violet-600"
        />
      </label>
      {checked && !disabled && (
        <div className="mt-2 flex items-center gap-2">
          {children}
          <span className="ml-auto text-sm font-semibold text-emerald-600">
            +{money(amount)}
          </span>
        </div>
      )}
    </div>
  );
}

function RateField({
  prefix,
  value,
  onChange,
  placeholder,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <span className="flex items-center gap-1 text-sm text-slate-500">
      {prefix}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        placeholder={placeholder}
        className="input w-20 py-1.5 text-center"
      />
    </span>
  );
}
