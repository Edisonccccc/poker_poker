import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkoutDealer, checkoutPlayer, type ReimbursementInput } from "./api";

export function useCheckoutPlayer(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      sessionId: string;
      chipsOut: number;
      reimbursements: ReimbursementInput[];
    }) =>
      checkoutPlayer(args.sessionId, {
        chipsOut: args.chipsOut,
        reimbursements: args.reimbursements,
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
