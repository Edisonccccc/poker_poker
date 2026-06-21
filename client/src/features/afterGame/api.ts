import { api } from "@/lib/api";

export interface SettlementPlayer {
  sessionId: string;
  tableId: string;
  player: { id: string; name: string; photoId: string | null };
  status: "active" | "checked_out";
  buyInTotal: number;
  reimburseTotal: number;
  chipsOut: number | null;
  net: number | null;
}

export interface SettlementDealer {
  sessionId: string;
  tableId: string;
  dealer: { id: string; name: string; photoId: string | null };
  status: "active" | "checked_out";
  tipsTotal: number | null;
}

export interface HostCost {
  id: string;
  category: string;
  amount: number;
  note: string | null;
}

export interface OtherParty {
  id: string;
  label: string;
  net: number;
  note: string | null;
}

export interface InsuranceRow {
  id: string;
  playerId: string | null;
  playerName: string | null;
  premium: number;
  payout: number;
  net: number; // player's gain (payout - premium)
  note: string | null;
}

export interface SettlementTotals {
  cashIn: number;
  playerPayout: number;
  dealerPayout: number;
  reimbursements: number;
  hostCosts: number;
  insurancePremiums: number;
  insurancePayouts: number;
  hourlyComp: number;
  hostTake: number;
  hostNet: number;
}

export interface Settlement {
  players: SettlementPlayer[];
  dealers: SettlementDealer[];
  hostCosts: HostCost[];
  others: OtherParty[];
  insurance: InsuranceRow[];
  totals: SettlementTotals;
}

export const getSettlement = (gameId: string) =>
  api.get<Settlement>(`/games/${gameId}/settlement`);

export const addHostCost = (
  gameId: string,
  body: { category: string; amount: number; note?: string | null },
) => api.post<HostCost>(`/games/${gameId}/host-costs`, body);

export const deleteHostCost = (id: string) =>
  api.del<void>(`/host-costs/${id}`);

export const addOtherParty = (
  gameId: string,
  body: { label: string; net: number; note?: string | null },
) => api.post<OtherParty>(`/games/${gameId}/settlements`, body);

export const deleteOtherParty = (id: string) =>
  api.del<void>(`/settlements/${id}`);

export interface InsuranceInput {
  playerId?: string | null;
  label?: string | null;
  premium: number;
  payout?: number;
}

export const addInsurance = (gameId: string, body: InsuranceInput) =>
  api.post<InsuranceRow>(`/games/${gameId}/insurance`, body);

export const updateInsurance = (
  id: string,
  body: Partial<InsuranceInput>,
) => api.patch<InsuranceRow>(`/insurance/${id}`, body);

export const deleteInsurance = (id: string) =>
  api.del<void>(`/insurance/${id}`);
