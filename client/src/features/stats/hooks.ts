import { useQuery } from "@tanstack/react-query";
import { getOverview, getPlayerStats } from "./api";

export function useStatsOverview() {
  return useQuery({ queryKey: ["stats", "overview"], queryFn: getOverview });
}

export function usePlayerStats() {
  return useQuery({ queryKey: ["stats", "players"], queryFn: getPlayerStats });
}
