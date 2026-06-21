import { api } from "@/lib/api";

export interface StatsOverview {
  games: number;
  tables: number;
  cashIn: number;
  playerPayout: number;
  dealerPayout: number;
  reimbursements: number;
  hostCosts: number;
  hostTake: number;
  hostNet: number;
}

export interface PlayerStat {
  playerId: string;
  name: string;
  photoId: string | null;
  gamesPlayed: number;
  sessions: number;
  totalBuyIn: number;
  totalNet: number;
  biggestWin: number;
  biggestLoss: number;
}

export const getOverview = () => api.get<StatsOverview>("/stats/overview");
export const getPlayerStats = () => api.get<PlayerStat[]>("/stats/players");
