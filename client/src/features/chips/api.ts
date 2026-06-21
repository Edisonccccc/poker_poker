import { api } from "@/lib/api";

export interface PerColor {
  color: string;
  count: number;
  value: number;
  subtotal: number;
}

export interface CountResult {
  perColor: PerColor[];
  total: number;
}

export const countChips = (tableId: string, photoId: string) =>
  api.post<CountResult>("/chips/count", { tableId, photoId });

export interface ChipIdentity {
  color: string;
  value: number | null;
}

export const identifyChip = (photoId: string) =>
  api.post<ChipIdentity>("/chips/identify", { photoId });
