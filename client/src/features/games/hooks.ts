import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTable,
  createGame,
  updateGame,
  deleteGame,
  deleteTable,
  getGame,
  getTable,
  listGames,
  type CreateGameInput,
  type CreateTableInput,
  type Status,
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

export function useUpdateGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      body: CreateGameInput & { status?: Status };
    }) => updateGame(args.id, args.body),
    onSuccess: (_d, args) => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game", args.id] });
    },
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
