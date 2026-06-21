import { api } from "@/lib/api";

export type GameType = "texas_holdem" | "blackjack";
export type Status = "open" | "closed";

export interface GameListItem {
  id: string;
  label: string | null;
  gameDate: string;
  startedAt: string;
  status: Status;
  _count: { tables: number };
}

export interface TableSummary {
  id: string;
  type: GameType;
  stakes: string | null;
  label: string | null;
  status: Status;
  _count: { denominations: number; playerSessions: number };
}

export interface GameDetail {
  id: string;
  label: string | null;
  gameDate: string;
  startedAt: string;
  status: Status;
  tables: TableSummary[];
}

export interface Denomination {
  id: string;
  color: string;
  value: string; // Decimal serialized as string
  refPhotoId: string | null;
}

export interface TableDetail {
  id: string;
  gameId: string;
  type: GameType;
  stakes: string | null;
  label: string | null;
  usesCents: boolean;
  status: Status;
  denominations: Denomination[];
}

export interface CreateGameInput {
  label?: string | null;
  gameDate?: string;
  startedAt?: string;
}

export interface DenominationInput {
  color: string;
  value: number;
  refPhotoId?: string | null;
}

export interface CreateTableInput {
  type: GameType;
  stakes?: string | null;
  label?: string | null;
  usesCents?: boolean;
  denominations: DenominationInput[];
}

export const listGames = () => api.get<GameListItem[]>("/games");
export const getGame = (id: string) => api.get<GameDetail>(`/games/${id}`);
export const createGame = (body: CreateGameInput) =>
  api.post<GameListItem>("/games", body);
export const deleteGame = (id: string) => api.del<void>(`/games/${id}`);

export const addTable = (gameId: string, body: CreateTableInput) =>
  api.post<TableDetail>(`/games/${gameId}/tables`, body);
export const getTable = (id: string) => api.get<TableDetail>(`/tables/${id}`);
export const deleteTable = (id: string) => api.del<void>(`/tables/${id}`);
