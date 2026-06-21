import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addBuyIn,
  checkInDealer,
  checkInPlayer,
  listDealerSessions,
  listPlayerSessions,
  removeDealerSession,
  removePlayerSession,
} from "./api";

const playerKey = (tableId: string) => ["player-sessions", tableId];
const dealerKey = (tableId: string) => ["dealer-sessions", tableId];

export function usePlayerSessions(tableId: string) {
  return useQuery({
    queryKey: playerKey(tableId),
    queryFn: () => listPlayerSessions(tableId),
  });
}

export function useDealerSessions(tableId: string) {
  return useQuery({
    queryKey: dealerKey(tableId),
    queryFn: () => listDealerSessions(tableId),
  });
}

export function useCheckInPlayer(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => checkInPlayer(tableId, profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: playerKey(tableId) }),
  });
}

export function useCheckInDealer(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => checkInDealer(tableId, profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: dealerKey(tableId) }),
  });
}

export function useAddBuyIn(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sessionId: string; amount: number }) =>
      addBuyIn(args.sessionId, args.amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: playerKey(tableId) }),
  });
}

export function useRemovePlayerSession(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removePlayerSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: playerKey(tableId) }),
  });
}

export function useRemoveDealerSession(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeDealerSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: dealerKey(tableId) }),
  });
}
