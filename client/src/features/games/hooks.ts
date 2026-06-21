import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTable,
  createGame,
  deleteGame,
  deleteTable,
  getGame,
  getTable,
  listGames,
  type CreateGameInput,
  type CreateTableInput,
} from "./api";

export function useGames() {
  return useQuery({ queryKey: ["games"], queryFn: listGames });
}

export function useGame(id: string) {
  return useQuery({ queryKey: ["game", id], queryFn: () => getGame(id) });
}

export function useCreateGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGameInput) => createGame(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["games"] }),
  });
}

export function useDeleteGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["games"] }),
  });
}

export function useAddTable(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTableInput) => addTable(gameId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["game", gameId] }),
  });
}

export function useTable(id: string) {
  return useQuery({ queryKey: ["table", id], queryFn: () => getTable(id) });
}

export function useDeleteTable(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["game", gameId] });
    },
  });
}
