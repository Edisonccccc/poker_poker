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
            className="absolute flex w-[68px] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <AuthImage
              photoId={seat.photoId}
              alt={seat.name}
              className={`h-12 w-12 rounded-full border-2 object-cover shadow ${
                seat.active
                  ? "border-violet-500"
                  : "border-slate-300 opacity-60"
              }`}
            />
            <span className="mt-0.5 max-w-[68px] truncate text-[11px] font-medium leading-tight text-slate-700">
              {seat.name}
            </span>
            <span className="text-[10px] leading-tight text-slate-500">
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
