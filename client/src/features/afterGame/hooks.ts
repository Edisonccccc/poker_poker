import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addHostCost,
  addOtherParty,
  deleteHostCost,
  deleteOtherParty,
  getSettlement,
} from "./api";

const key = (gameId: string) => ["settlement", gameId];

export function useSettlement(gameId: string) {
  return useQuery({
    queryKey: key(gameId),
    queryFn: () => getSettlement(gameId),
  });
}

export function useAddHostCost(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { category: string; amount: number; note?: string | null }) =>
      addHostCost(gameId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(gameId) }),
  });
}

export function useDeleteHostCost(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHostCost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(gameId) }),
  });
}

export function useAddOtherParty(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { label: string; net: number; note?: string | null }) =>
      addOtherParty(gameId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(gameId) }),
  });
}

export function useDeleteOtherParty(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOtherParty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(gameId) }),
  });
}
