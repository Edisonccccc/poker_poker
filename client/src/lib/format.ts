import type { GameType } from "@/features/games/api";

export const gameTypeLabel = (t: GameType): string =>
  t === "texas_holdem" ? "Texas Hold'em" : "Blackjack";

const TABLE_EMOJIS = ["🃏", "🎰", "♠️", "♥️", "♦️", "♣️", "🎲", "🪙", "💎", "🏆"];

const SESSION_EMOJIS = ["🎉", "🌙", "🔥", "🍀", "🎯", "💸", "🏆", "🎊", "🕹️", "⭐"];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic, varied emoji for a table based on its id. */
export const tableEmoji = (id: string): string =>
  TABLE_EMOJIS[hashId(id) % TABLE_EMOJIS.length];

/** Deterministic, varied emoji for a session based on its id. */
export const sessionEmoji = (id: string): string =>
  SESSION_EMOJIS[hashId(id) % SESSION_EMOJIS.length];

export const PROFILE_ROLES = ["player", "dealer", "host", "admin"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const roleEmoji: Record<ProfileRole, string> = {
  player: "🎯",
  dealer: "🃏",
  host: "🏠",
  admin: "👑",
};

export const formatGameDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

/** Whole-dollar display (chips/money are integers in v1). */
export const money = (value: string | number): string =>
  `$${Number(value).toLocaleString()}`;

/** Compact elapsed time, e.g. "1h 23m" or "8m". */
export function formatDuration(fromIso: string, toIso?: string): string {
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  const minutes = Math.max(0, Math.floor((end - new Date(fromIso).getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}
