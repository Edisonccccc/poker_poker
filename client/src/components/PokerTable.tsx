import { AuthImage } from "./AuthImage";

export interface Seat {
  id: string;
  name: string;
  photoId: string | null;
  active: boolean;
  subtitle: string;
}

/**
 * Felt poker table with one seat per player around the rail. Tap a seat to act.
 */
export function PokerTable({
  seats,
  centerLabel,
  onSelect,
}: {
  seats: Seat[];
  centerLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative mx-auto w-full" style={{ aspectRatio: "4 / 5" }}>
      {/* wooden rail + felt */}
      <div
        className="absolute inset-[6%] rounded-[48%] border-[7px] border-[#5b3b22]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, #1f9d61 0%, #14894f 48%, #0a6b3c 100%)",
          boxShadow:
            "0 14px 34px rgba(10,80,45,0.30), inset 0 0 55px rgba(0,0,0,0.35)",
        }}
      >
        {/* inner betting line */}
        <div className="absolute inset-[12%] rounded-[48%] border border-white/20" />
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <span className="text-sm font-semibold text-white/85">
            {centerLabel}
          </span>
        </div>
      </div>

      {seats.map((seat, i) => {
        const angle = ((-90 + (360 * i) / seats.length) * Math.PI) / 180;
        const left = 50 + 47 * Math.cos(angle);
        const top = 50 + 47 * Math.sin(angle);
        return (
          <button
            key={seat.id}
            onClick={() => onSelect(seat.id)}
            className="absolute flex w-[84px] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <AuthImage
              photoId={seat.photoId}
              alt={seat.name}
              fallback="avatar"
              className={`h-12 w-12 rounded-full border-2 object-cover ${
                seat.active
                  ? "border-emerald-400 ring-2 ring-emerald-400/70 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
                  : "border-slate-500 opacity-60 grayscale"
              }`}
            />
            <span className="mt-1 max-w-[84px] truncate text-[11px] font-semibold leading-tight text-slate-700">
              {seat.name}
            </span>
            <span
              className={`mt-0.5 rounded-full px-2 py-[1px] text-[10px] font-bold leading-tight shadow-sm ${
                seat.active
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-600/80 text-slate-100"
              }`}
            >
              {seat.subtitle}
            </span>
          </button>
        );
      })}

      {seats.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <span className="text-xs text-slate-400">
            Check in players to seat them
          </span>
        </div>
      )}
    </div>
  );
}
