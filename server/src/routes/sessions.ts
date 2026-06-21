import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";
import {
  getOwnedTable,
  getOwnedPlayerSession,
  getOwnedDealerSession,
} from "../lib/ownership";
import { sessionComp, sessionPctRebate } from "../lib/comp";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

const checkInSchema = z.object({ profileId: z.string().uuid() });
const buyInSchema = z.object({
  amount: z.number().positive(),
  occurredAt: z.string().optional(),
});
const playerCheckoutSchema = z.object({
  chipsOut: z.number().nonnegative(),
  reimbursements: z
    .array(
      z.object({
        category: z.string().min(1).max(40),
        amount: z.number().positive(),
      }),
    )
    .optional(),
  hourlyReturn: z.boolean().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  pctRebate: z.boolean().optional(),
  pctRate: z.number().nonnegative().optional(),
  checkinAt: z.string().optional(),
  checkoutAt: z.string().optional(),
});
const dealerCheckoutSchema = z.object({ tipsTotal: z.number().nonnegative() });
const paymentSchema = z.object({
  direction: z.enum(["sent", "received"]),
  amount: z.number().positive(),
});

const PLAYER_SELECT = {
  id: true,
  checkinAt: true,
  checkoutAt: true,
  status: true,
  chipsOut: true,
  hourlyReturn: true,
  hourlyRate: true,
  pctRebate: true,
  pctRate: true,
  player: { select: { id: true, name: true, photoId: true } },
  ledger: {
    select: { id: true, type: true, amount: true, category: true, occurredAt: true },
    orderBy: { occurredAt: "asc" as const },
  },
};

const DEALER_SELECT = {
  id: true,
  checkinAt: true,
  checkoutAt: true,
  status: true,
  tipsTotal: true,
  dealer: { select: { id: true, name: true, photoId: true } },
};

// reason: ledger amounts are Prisma Decimal (serialized as string); compute in JS.
function playerRow(s: any) {
  const sum = (type: string) =>
    s.ledger
      .filter((l: any) => l.type === type)
      .reduce((a: number, l: any) => a + Number(l.amount), 0);
  const buyInTotal = sum("buy_in");
  const reimburseTotal = sum("reimbursement");
  const comp = sessionComp(s);
  const checkedOut = s.status === "checked_out" && s.chipsOut !== null;
  const chipsOut = checkedOut ? Number(s.chipsOut) : 0;
  const pct = checkedOut ? sessionPctRebate(s, buyInTotal, chipsOut) : 0;
  const net = checkedOut
    ? chipsOut - buyInTotal + reimburseTotal + comp + pct
    : null;
  const entries = s.ledger.map((l: any) => ({
    id: l.id,
    type: l.type,
    amount: Number(l.amount),
    category: l.category ?? null,
    occurredAt: l.occurredAt,
  }));
  const { ledger, ...rest } = s;
  return { ...rest, buyInTotal, reimburseTotal, comp, pctRebateAmount: pct, net, entries };
}

// ── Player sessions ───────────────────────────────────────────────────────────

sessionsRouter.get("/tables/:tableId/player-sessions", async (req, res) => {
  const table = await getOwnedTable(req.params.tableId, req.user!.id);
  if (!table) return res.status(404).json({ error: "not found" });
  const sessions = await prisma.playerSession.findMany({
    where: { tableId: table.id },
    orderBy: { checkinAt: "asc" },
    select: PLAYER_SELECT,
  });
  res.json(sessions.map(playerRow));
});

sessionsRouter.post("/tables/:tableId/player-sessions", async (req, res) => {
  const table = await getOwnedTable(req.params.tableId, req.user!.id);
  if (!table) return res.status(404).json({ error: "not found" });
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // Player must belong to this host (or be an admin-shared person).
  const player = await prisma.player.findFirst({
    where: {
      id: parsed.data.profileId,
      OR: [{ hostId: req.user!.id }, { shared: true }],
    },
  });
  if (!player) return res.status(404).json({ error: "player not found" });
  // No duplicate active session at this table.
  const active = await prisma.playerSession.findFirst({
    where: { tableId: table.id, playerId: player.id, status: "active" },
  });
  if (active) {
    return res.status(409).json({ error: "player already checked in" });
  }
  const session = await prisma.playerSession.create({
    data: { tableId: table.id, playerId: player.id },
    select: PLAYER_SELECT,
  });
  res.status(201).json(playerRow(session));
});

sessionsRouter.post("/player-sessions/:id/buy-ins", async (req, res) => {
  const session = await getOwnedPlayerSession(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "not found" });
  const parsed = buyInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const entry = await prisma.ledgerEntry.create({
    data: {
      tableId: session.tableId,
      playerSessionId: session.id,
      type: "buy_in",
      amount: parsed.data.amount,
      occurredAt: parsed.data.occurredAt
        ? new Date(parsed.data.occurredAt)
        : undefined,
    },
    select: { id: true, amount: true, occurredAt: true },
  });
  res.status(201).json(entry);
});

// Record a cash payment for a player: host sent to / received from them.
sessionsRouter.post("/player-sessions/:id/payments", async (req, res) => {
  const session = await getOwnedPlayerSession(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "not found" });
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const entry = await prisma.ledgerEntry.create({
    data: {
      tableId: session.tableId,
      playerSessionId: session.id,
      type: "payment",
      amount: parsed.data.amount,
      category: parsed.data.direction, // 'sent' | 'received'
    },
    select: { id: true, amount: true, category: true, occurredAt: true },
  });
  res.status(201).json(entry);
});

sessionsRouter.get("/player-sessions/:id", async (req, res) => {
  const owned = await getOwnedPlayerSession(req.params.id, req.user!.id);
  if (!owned) return res.status(404).json({ error: "not found" });
  const session = await prisma.playerSession.findUnique({
    where: { id: owned.id },
    select: {
      ...PLAYER_SELECT,
      ledger: {
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
  res.json(session);
});

sessionsRouter.delete("/player-sessions/:id", async (req, res) => {
  const session = await getOwnedPlayerSession(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "not found" });
  await prisma.playerSession.delete({ where: { id: session.id } });
  res.status(204).end();
});

// Check out a player: set chips, replace reimbursements, mark checked out.
sessionsRouter.post("/player-sessions/:id/checkout", async (req, res) => {
  const session = await getOwnedPlayerSession(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "not found" });
  const parsed = playerCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const reimbursements = parsed.data.reimbursements ?? [];

  await prisma.$transaction([
    // replace existing reimbursements so re-checkout is idempotent
    prisma.ledgerEntry.deleteMany({
      where: { playerSessionId: session.id, type: "reimbursement" },
    }),
    ...reimbursements.map((r) =>
      prisma.ledgerEntry.create({
        data: {
          tableId: session.tableId,
          playerSessionId: session.id,
          type: "reimbursement",
          amount: r.amount,
          category: r.category,
        },
      }),
    ),
    prisma.playerSession.update({
      where: { id: session.id },
      data: {
        chipsOut: parsed.data.chipsOut,
        chipMethod: "manual",
        checkoutAt: parsed.data.checkoutAt
          ? new Date(parsed.data.checkoutAt)
          : new Date(),
        status: "checked_out",
        ...(parsed.data.checkinAt
          ? { checkinAt: new Date(parsed.data.checkinAt) }
          : {}),
        ...(parsed.data.hourlyReturn !== undefined
          ? { hourlyReturn: parsed.data.hourlyReturn }
          : {}),
        ...(parsed.data.hourlyRate !== undefined
          ? { hourlyRate: parsed.data.hourlyRate }
          : {}),
        ...(parsed.data.pctRebate !== undefined
          ? { pctRebate: parsed.data.pctRebate }
          : {}),
        ...(parsed.data.pctRate !== undefined
          ? { pctRate: parsed.data.pctRate }
          : {}),
      },
    }),
  ]);

  const updated: any = await prisma.playerSession.findUnique({
    where: { id: session.id },
    select: PLAYER_SELECT,
  });
  res.json(playerRow(updated));
});

// ── Dealer sessions ───────────────────────────────────────────────────────────

sessionsRouter.get("/tables/:tableId/dealer-sessions", async (req, res) => {
  const table = await getOwnedTable(req.params.tableId, req.user!.id);
  if (!table) return res.status(404).json({ error: "not found" });
  const sessions = await prisma.dealerSession.findMany({
    where: { tableId: table.id },
    orderBy: { checkinAt: "asc" },
    select: DEALER_SELECT,
  });
  res.json(sessions);
});

sessionsRouter.post("/tables/:tableId/dealer-sessions", async (req, res) => {
  const table = await getOwnedTable(req.params.tableId, req.user!.id);
  if (!table) return res.status(404).json({ error: "not found" });
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const dealer = await prisma.player.findFirst({
    where: {
      id: parsed.data.profileId,
      OR: [{ hostId: req.user!.id }, { shared: true }],
    },
  });
  if (!dealer) return res.status(404).json({ error: "person not found" });
  const active = await prisma.dealerSession.findFirst({
    where: { tableId: table.id, dealerId: dealer.id, status: "active" },
  });
  if (active) {
    return res.status(409).json({ error: "dealer already checked in" });
  }
  const session = await prisma.dealerSession.create({
    data: { tableId: table.id, dealerId: dealer.id },
    select: DEALER_SELECT,
  });
  res.status(201).json(session);
});

sessionsRouter.delete("/dealer-sessions/:id", async (req, res) => {
  const session = await getOwnedDealerSession(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "not found" });
  await prisma.dealerSession.delete({ where: { id: session.id } });
  res.status(204).end();
});

// Check out a dealer: set tips total, mark checked out.
sessionsRouter.post("/dealer-sessions/:id/checkout", async (req, res) => {
  const session = await getOwnedDealerSession(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "not found" });
  const parsed = dealerCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const updated = await prisma.dealerSession.update({
    where: { id: session.id },
    data: {
      tipsTotal: parsed.data.tipsTotal,
      tipsMethod: "manual",
      checkoutAt: new Date(),
      status: "checked_out",
    },
    select: DEALER_SELECT,
  });
  res.json(updated);
});
