import { api } from "@/lib/api";
import type { PlayerSession, DealerSession } from "@/features/sessions/api";

export interface ReimbursementInput {
  category: string;
  amount: number;
}

export const checkoutPlayer = (
  sessionId: string,
  body: {
    chipsOut: number;
    reimbursements: ReimbursementInput[];
    hourlyReturn?: boolean;
    hourlyRate?: number;
    checkinAt?: string;
    checkoutAt?: string;
  },
) => api.post<PlayerSession>(`/player-sessions/${sessionId}/checkout`, body);

export const checkoutDealer = (sessionId: string, tipsTotal: number) =>
  api.post<DealerSession>(`/dealer-sessions/${sessionId}/checkout`, {
    tipsTotal,
  });
