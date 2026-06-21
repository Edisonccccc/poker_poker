import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";
import { getOwnedGame } from "../lib/ownership";

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

// ── Settlement summary (bank model, computed) ────────────────────────────────

afterGameRouter.get("/games/:gameId/settlement", async (req, res) => {
  const game = await getOwnedGame(req.params.gameId, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });

  const [playerSessions, dealerSessions, hostCosts, others] = await Promise.all([
    prisma.playerSession.findMany({
      where: { table: { gameId: game.id } },
      orderBy: { checkinAt: "asc" },
      select: {
        id: true,
        status: true,
        chipsOut: true,
        tableId: true,
        player: { select: { id: true, name: true, photoId: true } },
        ledger: { select: { type: true, amount: true } },
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
  ]);

  const players = playerSessions.map((s: any) => {
    const buyInTotal = s.ledger
      .filter((l: any) => l.type === "buy_in")
      .reduce((a: number, l: any) => a + num(l.amount), 0);
    const reimburseTotal = s.ledger
      .filter((l: any) => l.type === "reimbursement")
      .reduce((a: number, l: any) => a + num(l.amount), 0);
    const checkedOut = s.status === "checked_out" && s.chipsOut !== null;
    const net = checkedOut
      ? num(s.chipsOut) - buyInTotal + reimburseTotal
      : null;
    return {
      sessionId: s.id,
      tableId: s.tableId,
      player: s.player,
      status: s.status,
      buyInTotal,
      reimburseTotal,
      chipsOut: checkedOut ? num(s.chipsOut) : null,
      net,
    };
  });

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
  const hostTake = cashIn - playerPayout - dealerPayout - reimbursements;
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
    totals: {
      cashIn,
      playerPayout,
      dealerPayout,
      reimbursements,
      hostCosts: hostCostsTotal,
      hostTake,
      hostNet,
    },
  });
});
