import { AuthImage } from "./AuthImage";
import { money } from "@/lib/format";
import type { PlayerSession } from "@/features/sessions/api";

/**
 * Felt poker table with players seated around the rail. Tap a seat to act on
 * that player. Empty table shows a hint.
 */
export function PokerTable({
  players,
  centerLabel,
  onSelect,
}: {
  players: PlayerSession[];
  centerLabel: string;
  onSelect: (session: PlayerSession) => void;
}) {
  return (
    <div className="relative mx-auto w-full" style={{ aspectRatio: "4 / 5" }}>
      {/* rail + felt */}
      <div
        className="absolute inset-[6%] rounded-[48%] border-[7px] border-[#4a2f1a]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, #1a8a55 0%, #0f5132 55%, #0a3a25 100%)",
          boxShadow: "inset 0 0 50px rgba(0,0,0,0.45)",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <span className="text-sm font-semibold text-white/75">
            {centerLabel}
          </span>
        </div>
      </div>

      {/* seats */}
      {players.map((s, i) => {
        const angle = ((-90 + (360 * i) / players.length) * Math.PI) / 180;
        const left = 50 + 47 * Math.cos(angle);
        const top = 50 + 47 * Math.sin(angle);
        const active = s.status === "active";
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="absolute flex w-[68px] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <AuthImage
              photoId={s.player.photoId}
              alt={s.player.name}
              className={`h-12 w-12 rounded-full border-2 object-cover shadow-md ${
                active ? "border-emerald-400" : "border-white/30 opacity-60"
              }`}
            />
            <span className="mt-0.5 max-w-[68px] truncate text-[11px] font-medium leading-tight">
              {s.player.name}
            </span>
            <span className="text-[10px] leading-tight text-white/65">
              {active
                ? money(s.buyInTotal)
                : s.net !== null
                  ? money(s.net)
                  : ""}
            </span>
          </button>
        );
      })}

      {players.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <span className="text-xs text-white/50">Check in players to seat them</span>
        </div>
      )}
    </div>
  );
}
