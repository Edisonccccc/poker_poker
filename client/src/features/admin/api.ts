import { api } from "@/lib/api";

export interface AdminHost {
  id: string;
  displayName: string;
  username: string;
  role: "admin" | "host";
  createdAt: string;
  games: number;
  tables: number;
  players: number;
  hostNet: number;
}

export const listHosts = () => api.get<AdminHost[]>("/admin/hosts");
