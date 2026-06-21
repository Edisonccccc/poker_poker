import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkoutDealer, checkoutPlayer, type ReimbursementInput } from "./api";

export function useCheckoutPlayer(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      sessionId: string;
      chipsOut: number;
      reimbursements: ReimbursementInput[];
      hourlyReturn?: boolean;
      hourlyRate?: number;
      checkinAt?: string;
      checkoutAt?: string;
    }) =>
      checkoutPlayer(args.sessionId, {
        chipsOut: args.chipsOut,
        reimbursements: args.reimbursements,
        hourlyReturn: args.hourlyReturn,
        hourlyRate: args.hourlyRate,
        checkinAt: args.checkinAt,
        checkoutAt: args.checkoutAt,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player-sessions", tableId] });
      qc.invalidateQueries({ queryKey: ["settlement"] });
    },
  });
}

export function useCheckoutDealer(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sessionId: string; tipsTotal: number }) =>
      checkoutDealer(args.sessionId, args.tipsTotal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-sessions", tableId] });
      qc.invalidateQueries({ queryKey: ["settlement"] });
    },
  });
}
