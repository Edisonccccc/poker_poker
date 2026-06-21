import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";
import { getOwnedGame } from "../lib/ownership";
import { sessionComp, sessionPctRebate } from "../lib/comp";

export const afterGameRouter = Router();
afterGameRouter.use(requireAuth);

const hostCostSchema = z.object({
  category: z.string().min(1).max(40),
  amount: z.number().positive(),
  note: z.string().max(200).nullable().optional(),
});

const settlementSchema = z.object({
  label: z.string().min(1).max(80),
  net: z.number(),
  note: z.string().max(200).nullable().optional(),
});

const insuranceSchema = z.object({
  playerId: z.string().uuid().nullable().optional(),
  label: z.string().max(80).nullable().optional(),
  premium: z.number().nonnegative(),
  payout: z.number().nonnegative().optional(),
  note: z.string().max(200).nullable().optional(),
});

const num = (v: unknown) => Number(v ?? 0);

// ── Host costs ────────────────────────────────────────────────────────────────

afterGameRouter.post("/games/:gameId/host-costs", async (req, res) => {
  const game = await getOwnedGame(req.params.gameId, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });
  const parsed = hostCostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const cost = await prisma.hostCost.create({
    data: {
      gameId: game.id,
      category: parsed.data.category,
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
    },
  });
  res.status(201).json(cost);
});

afterGameRouter.delete("/host-costs/:id", async (req, res) => {
  const cost = await prisma.hostCost.findFirst({
    where: { id: req.params.id, game: { hostId: req.user!.id } },
  });
  if (!cost) return res.status(404).json({ error: "not found" });
  await prisma.hostCost.delete({ where: { id: cost.id } });
  res.status(204).end();
});

// ── Other-party settlements ──────────────────────────────────────────────────

afterGameRouter.post("/games/:gameId/settlements", async (req, res) => {
  const game = await getOwnedGame(req.params.gameId, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });
  const parsed = settlementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const row = await prisma.settlement.create({
    data: {
      gameId: game.id,
      partyType: "other",
      label: parsed.data.label,
      net: parsed.data.net,
      note: parsed.data.note ?? null,
    },
  });
  res.status(201).json(row);
});

afterGameRouter.delete("/settlements/:id", async (req, res) => {
  const row = await prisma.settlement.findFirst({
    where: { id: req.params.id, game: { hostId: req.user!.id } },
  });
  if (!row) return res.status(404).json({ error: "not found" });
  await prisma.settlement.delete({ where: { id: row.id } });
  res.status(204).end();
});

// ── Insurance ─────────────────────────────────────────────────────────────────

afterGameRouter.post("/games/:gameId/insurance", async (req, res) => {
  const game = await getOwnedGame(req.params.gameId, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });
  const parsed = insuranceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const row = await prisma.insurance.create({
    data: {
      gameId: game.id,
      playerId: parsed.data.playerId ?? null,
      label: parsed.data.label ?? null,
      premium: parsed.data.premium,
      payout: parsed.data.payout ?? 0,
      note: parsed.data.note ?? null,
    },
  });
  res.status(201).json(row);
});

afterGameRouter.patch("/insurance/:id", async (req, res) => {
  const existing = await prisma.insurance.findFirst({
    where: { id: req.params.id, game: { hostId: req.user!.id } },
  });
  if (!existing) return res.status(404).json({ error: "not found" });
  const parsed = insuranceSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const row = await prisma.insurance.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json(row);
});

afterGameRouter.delete("/insurance/:id", async (req, res) => {
  const existing = await prisma.insurance.findFirst({
    where: { id: req.params.id, game: { hostId: req.user!.id } },
  });
  if (!existing) return res.status(404).json({ error: "not found" });
  await prisma.insurance.delete({ where: { id: existing.id } });
  res.status(204).end();
});

// ── Settlement summary (bank model, computed) ────────────────────────────────

afterGameRouter.get("/games/:gameId/settlement", async (req, res) => {
  const game = await getOwnedGame(req.params.gameId, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });

  const [playerSessions, dealerSessions, hostCosts, others, insurance] =
    await Promise.all([
    prisma.playerSession.findMany({
      where: { table: { gameId: game.id } },
      orderBy: { checkinAt: "asc" },
      select: {
        id: true,
        status: true,
        chipsOut: true,
        tableId: true,
        checkinAt: true,
        checkoutAt: true,
        hourlyReturn: true,
        hourlyRate: true,
        pctRebate: true,
        pctRate: true,
        player: { select: { id: true, name: true, photoId: true } },
        ledger: { select: { type: true, amount: true, category: true } },
      },
    }),
    prisma.dealerSession.findMany({
      where: { table: { gameId: game.id } },
      orderBy: { checkinAt: "asc" },
      select: {
        id: true,
        status: true,
        tipsTotal: true,
        tableId: true,
        dealer: { select: { id: true, name: true, photoId: true } },
      },
    }),
    prisma.hostCost.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.settlement.findMany({
      where: { gameId: game.id, partyType: "other" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.insurance.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: "asc" },
      include: { player: { select: { id: true, name: true } } },
    }),
  ]);

  // Insurance: premiums in (host income), payouts out (host expense). Per player,
  // the delta to their net is (payout − premium).
  let insurancePremiums = 0;
  let insurancePayouts = 0;
  const insByPlayer = new Map<string, number>();
  for (const r of insurance as any[]) {
    insurancePremiums += num(r.premium);
    insurancePayouts += num(r.payout);
    if (r.playerId) {
      insByPlayer.set(
        r.playerId,
        (insByPlayer.get(r.playerId) ?? 0) + num(r.payout) - num(r.premium),
      );
    }
  }

  const players = playerSessions.map((s: any) => {
    const buyInTotal = s.ledger
      .filter((l: any) => l.type === "buy_in")
      .reduce((a: number, l: any) => a + num(l.amount), 0);
    const reimburseTotal = s.ledger
      .filter((l: any) => l.type === "reimbursement")
      .reduce((a: number, l: any) => a + num(l.amount), 0);
    const checkedOut = s.status === "checked_out" && s.chipsOut !== null;
    const comp = checkedOut ? sessionComp(s) : 0;
    const pct = checkedOut
      ? sessionPctRebate(s, buyInTotal, num(s.chipsOut))
      : 0;
    const net = checkedOut
      ? num(s.chipsOut) - buyInTotal + reimburseTotal + comp + pct
      : null;
    const sent = s.ledger
      .filter((l: any) => l.type === "payment" && l.category === "sent")
      .reduce((a: number, l: any) => a + num(l.amount), 0);
    const received = s.ledger
      .filter((l: any) => l.type === "payment" && l.category === "received")
      .reduce((a: number, l: any) => a + num(l.amount), 0);
    return {
      sessionId: s.id,
      tableId: s.tableId,
      player: s.player,
      status: s.status,
      buyInTotal,
      reimburseTotal,
      comp,
      pctRebate: pct,
      paid: sent - received, // host net paid to player so far
      chipsOut: checkedOut ? num(s.chipsOut) : null,
      net,
    };
  });

  // Fold each player's insurance delta into their net once (first checked-out row).
  const insApplied = new Set<string>();
  for (const p of players) {
    if (p.net === null) continue;
    if (insApplied.has(p.player.id)) continue;
    const delta = insByPlayer.get(p.player.id);
    if (delta) p.net += delta;
    insApplied.add(p.player.id);
  }

  const dealers = dealerSessions.map((s: any) => ({
    sessionId: s.id,
    tableId: s.tableId,
    dealer: s.dealer,
    status: s.status,
    tipsTotal: s.tipsTotal !== null ? num(s.tipsTotal) : null,
  }));

  const cashIn = players.reduce((a: number, p: any) => a + p.buyInTotal, 0);
  const reimbursements = players.reduce(
    (a: number, p: any) => a + p.reimburseTotal,
    0,
  );
  const playerPayout = players.reduce(
    (a: number, p: any) => a + (p.chipsOut ?? 0),
    0,
  );
  const dealerPayout = dealers.reduce(
    (a: number, d: { tipsTotal: number | null }) => a + (d.tipsTotal ?? 0),
    0,
  );
  const hostCostsTotal = hostCosts.reduce(
    (a: number, c: any) => a + num(c.amount),
    0,
  );
  const hourlyComp = players.reduce((a: number, p: any) => a + (p.comp ?? 0), 0);
  const pctRebateTotal = players.reduce(
    (a: number, p: any) => a + (p.pctRebate ?? 0),
    0,
  );
  const hostTake =
    cashIn -
    playerPayout -
    dealerPayout -
    reimbursements +
    insurancePremiums -
    insurancePayouts -
    hourlyComp -
    pctRebateTotal;
  const hostNet = hostTake - hostCostsTotal;

  res.json({
    players,
    dealers,
    hostCosts: hostCosts.map((c: any) => ({
      id: c.id,
      category: c.category,
      amount: num(c.amount),
      note: c.note,
    })),
    others: others.map((o: any) => ({
      id: o.id,
      label: o.label,
      net: num(o.net),
      note: o.note,
    })),
    insurance: insurance.map((r: any) => ({
      id: r.id,
      playerId: r.playerId,
      playerName: r.player?.name ?? r.label ?? null,
      premium: num(r.premium),
      payout: num(r.payout),
      net: num(r.payout) - num(r.premium), // player's gain
      note: r.note,
    })),
    totals: {
      cashIn,
      playerPayout,
      dealerPayout,
      reimbursements,
      hostCosts: hostCostsTotal,
      insurancePremiums,
      insurancePayouts,
      hourlyComp,
      pctRebate: pctRebateTotal,
      hostTake,
      hostNet,
    },
  });
});
