import { api } from "@/lib/api";

export type SessionStatus = "active" | "checked_out";

export interface SessionPerson {
  id: string;
  name: string;
  photoId: string | null;
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
