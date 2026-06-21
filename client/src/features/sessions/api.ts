import { api } from "@/lib/api";

export type SessionStatus = "active" | "checked_out";

export interface SessionPerson {
  id: string;
  name: string;
  photoId: string | null;
}

export interface LedgerEntry {
  id: string;
  type: "buy_in" | "reimbursement" | "tip" | "adjustment";
  amount: number;
  category: string | null;
  occurredAt: string;
}

export interface PlayerSession {
  id: string;
  checkinAt: string;
  checkoutAt: string | null;
  status: SessionStatus;
  chipsOut: string | null;
  player: SessionPerson;
  buyInTotal: number;
  reimburseTotal: number;
  net: number | null;
  entries: LedgerEntry[];
}

/** One player's full history at a table (across multiple check-in cycles). */
export interface PlayerGroup {
  playerId: string;
  player: SessionPerson;
  sessions: PlayerSession[]; // oldest first
  active: PlayerSession | null;
  totalBuyIn: number;
  netSoFar: number; // sum of net over checked-out sessions
  hasActive: boolean;
}

export function groupByPlayer(sessions: PlayerSession[]): PlayerGroup[] {
  const map = new Map<string, PlayerGroup>();
  const ordered = [...sessions].sort(
    (a, b) => +new Date(a.checkinAt) - +new Date(b.checkinAt),
  );
  for (const s of ordered) {
    let g = map.get(s.player.id);
    if (!g) {
      g = {
        playerId: s.player.id,
        player: s.player,
        sessions: [],
        active: null,
        totalBuyIn: 0,
        netSoFar: 0,
        hasActive: false,
      };
      map.set(s.player.id, g);
    }
    g.sessions.push(s);
    g.totalBuyIn += s.buyInTotal;
    if (s.status === "active") {
      g.active = s;
      g.hasActive = true;
    } else if (s.net !== null) {
      g.netSoFar += s.net;
    }
  }
  return [...map.values()];
}

export interface DealerSession {
  id: string;
  checkinAt: string;
  checkoutAt: string | null;
  status: SessionStatus;
  tipsTotal: string | null;
  dealer: SessionPerson;
}

export const listPlayerSessions = (tableId: string) =>
  api.get<PlayerSession[]>(`/tables/${tableId}/player-sessions`);

export const listDealerSessions = (tableId: string) =>
  api.get<DealerSession[]>(`/tables/${tableId}/dealer-sessions`);

export const checkInPlayer = (tableId: string, profileId: string) =>
  api.post<PlayerSession>(`/tables/${tableId}/player-sessions`, { profileId });

export const checkInDealer = (tableId: string, profileId: string) =>
  api.post<DealerSession>(`/tables/${tableId}/dealer-sessions`, { profileId });

export const addBuyIn = (sessionId: string, amount: number) =>
  api.post<{ id: string }>(`/player-sessions/${sessionId}/buy-ins`, { amount });

export const removePlayerSession = (id: string) =>
  api.del<void>(`/player-sessions/${id}`);

export const removeDealerSession = (id: string) =>
  api.del<void>(`/dealer-sessions/${id}`);
