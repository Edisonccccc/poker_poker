import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../auth/middleware";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const num = (v: unknown) => Number(v ?? 0);

async function hostSummary(hostId: string) {
  const [games, tables, players, playerSessions, dealerSessions, hostCosts] =
    await Promise.all([
      prisma.game.count({ where: { hostId } }),
      prisma.table.count({ where: { game: { hostId } } }),
      prisma.player.count({ where: { hostId } }),
      prisma.playerSession.findMany({
        where: { table: { game: { hostId } } },
        select: {
          status: true,
          chipsOut: true,
          ledger: { select: { type: true, amount: true } },
        },
      }),
      prisma.dealerSession.findMany({
        where: { table: { game: { hostId } } },
        select: { tipsTotal: true },
      }),
      prisma.hostCost.findMany({
        where: { game: { hostId } },
        select: { amount: true },
      }),
    ]);

  let cashIn = 0;
  let reimbursements = 0;
  let playerPayout = 0;
  for (const s of playerSessions as any[]) {
    for (const l of s.ledger) {
      if (l.type === "buy_in") cashIn += num(l.amount);
      else if (l.type === "reimbursement") reimbursements += num(l.amount);
    }
    if (s.status === "checked_out" && s.chipsOut !== null)
      playerPayout += num(s.chipsOut);
  }
  const dealerPayout = (dealerSessions as any[]).reduce(
    (a, d) => a + num(d.tipsTotal),
    0,
  );
  const hostCostsTotal = (hostCosts as any[]).reduce(
    (a, c) => a + num(c.amount),
    0,
  );
  const hostNet =
    cashIn - playerPayout - dealerPayout - reimbursements - hostCostsTotal;

  return { games, tables, players, hostNet };
}

// All hosts with a lifetime summary. Admin only.
adminRouter.get("/admin/hosts", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const rows = await Promise.all(
    users.map(async (u: any) => ({ ...u, ...(await hostSummary(u.id)) })),
  );
  res.json(rows);
});
