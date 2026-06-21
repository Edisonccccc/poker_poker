import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";

export const statsRouter = Router();
statsRouter.use(requireAuth);

const num = (v: unknown) => Number(v ?? 0);

// Host lifetime overview (bank model, across all games).
statsRouter.get("/stats/overview", async (req, res) => {
  const hostId = req.user!.id;
  const [games, tables, playerSessions, dealerSessions, hostCosts] =
    await Promise.all([
      prisma.game.count({ where: { hostId } }),
      prisma.table.count({ where: { game: { hostId } } }),
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
  const hostTake = cashIn - playerPayout - dealerPayout - reimbursements;

  res.json({
    games,
    tables,
    cashIn,
    playerPayout,
    dealerPayout,
    reimbursements,
    hostCosts: hostCostsTotal,
    hostTake,
    hostNet: hostTake - hostCostsTotal,
  });
});

// Per-player lifetime aggregates for the host's games.
statsRouter.get("/stats/players", async (req, res) => {
  const hostId = req.user!.id;
  const sessions = await prisma.playerSession.findMany({
    where: { table: { game: { hostId } } },
    select: {
      status: true,
      chipsOut: true,
      player: { select: { id: true, name: true, photoId: true } },
      table: { select: { gameId: true } },
      ledger: { select: { type: true, amount: true } },
    },
  });

  interface Agg {
    playerId: string;
    name: string;
    photoId: string | null;
    games: Set<string>;
    sessions: number;
    totalBuyIn: number;
    totalNet: number;
    biggestWin: number;
    biggestLoss: number;
  }
  const map = new Map<string, Agg>();

  for (const s of sessions as any[]) {
    const id = s.player.id;
    let a = map.get(id);
    if (!a) {
      a = {
        playerId: id,
        name: s.player.name,
        photoId: s.player.photoId,
        games: new Set(),
        sessions: 0,
        totalBuyIn: 0,
        totalNet: 0,
        biggestWin: 0,
        biggestLoss: 0,
      };
      map.set(id, a);
    }
    a.sessions += 1;
    a.games.add(s.table.gameId);
    let buyIn = 0;
    let reimburse = 0;
    for (const l of s.ledger) {
      if (l.type === "buy_in") buyIn += num(l.amount);
      else if (l.type === "reimbursement") reimburse += num(l.amount);
    }
    a.totalBuyIn += buyIn;
    if (s.status === "checked_out" && s.chipsOut !== null) {
      const net = num(s.chipsOut) - buyIn + reimburse;
      a.totalNet += net;
      a.biggestWin = Math.max(a.biggestWin, net);
      a.biggestLoss = Math.min(a.biggestLoss, net);
    }
  }

  const players = [...map.values()]
    .map((a) => ({
      playerId: a.playerId,
      name: a.name,
      photoId: a.photoId,
      gamesPlayed: a.games.size,
      sessions: a.sessions,
      totalBuyIn: a.totalBuyIn,
      totalNet: a.totalNet,
      biggestWin: a.biggestWin,
      biggestLoss: a.biggestLoss,
    }))
    .sort((x, y) => y.totalNet - x.totalNet);

  res.json(players);
});
