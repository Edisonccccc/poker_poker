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
      <div
        className="absolute inset-[6%] rounded-[48%] border-4 border-violet-200"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f5f3ff 55%, #ede9fe 100%)",
          boxShadow: "0 10px 30px rgba(124,58,237,0.12)",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <span className="text-sm font-semibold text-violet-500/80">
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
