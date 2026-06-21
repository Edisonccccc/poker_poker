import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";
import { getOwnedGame } from "../lib/ownership";

export const gamesRouter = Router();
gamesRouter.use(requireAuth);

const gameSchema = z.object({
  label: z.string().max(120).nullable().optional(),
  gameDate: z.string().optional(), // "yyyy-mm-dd" or ISO
  startedAt: z.string().optional(), // ISO datetime
  status: z.enum(["open", "closed"]).optional(),
});

const tableCreateSchema = z.object({
  type: z.enum(["texas_holdem", "blackjack"]),
  stakes: z.string().max(40).nullable().optional(),
  label: z.string().max(80).nullable().optional(),
  usesCents: z.boolean().optional(),
  denominations: z
    .array(
      z.object({
        color: z.string().min(1).max(40),
        value: z.number().nonnegative(),
        refPhotoId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1, "add at least one chip denomination"),
});

const GAME_LIST_SELECT = {
  id: true,
  label: true,
  gameDate: true,
  startedAt: true,
  status: true,
  _count: { select: { tables: true } },
};

// List the host's games, newest first.
gamesRouter.get("/", async (req, res) => {
  const games = await prisma.game.findMany({
    where: { hostId: req.user!.id },
    orderBy: [{ gameDate: "desc" }, { startedAt: "desc" }],
    select: GAME_LIST_SELECT,
  });
  res.json(games);
});

gamesRouter.post("/", async (req, res) => {
  const parsed = gameSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // reason: build the data object incrementally; Prisma defaults fill the rest.
  const data: any = { hostId: req.user!.id, label: parsed.data.label ?? null };
  if (parsed.data.gameDate) data.gameDate = new Date(parsed.data.gameDate);
  if (parsed.data.startedAt) data.startedAt = new Date(parsed.data.startedAt);
  const game = await prisma.game.create({ data, select: GAME_LIST_SELECT });
  res.status(201).json(game);
});

// One game with its tables (and denomination/player counts).
gamesRouter.get("/:id", async (req, res) => {
  const game = await prisma.game.findFirst({
    where: { id: req.params.id, hostId: req.user!.id },
    select: {
      id: true,
      label: true,
      gameDate: true,
      startedAt: true,
      status: true,
      tables: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          stakes: true,
          label: true,
          status: true,
          _count: {
            select: { denominations: true, playerSessions: true },
          },
        },
      },
    },
  });
  if (!game) return res.status(404).json({ error: "not found" });
  res.json(game);
});

gamesRouter.patch("/:id", async (req, res) => {
  const parsed = gameSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const game = await getOwnedGame(req.params.id, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });

  const data: any = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  if (parsed.data.gameDate) data.gameDate = new Date(parsed.data.gameDate);
  if (parsed.data.startedAt) data.startedAt = new Date(parsed.data.startedAt);
  if (parsed.data.status) data.status = parsed.data.status;

  const updated = await prisma.game.update({
    where: { id: game.id },
    data,
    select: GAME_LIST_SELECT,
  });
  res.json(updated);
});

gamesRouter.delete("/:id", async (req, res) => {
  const game = await getOwnedGame(req.params.id, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });
  await prisma.game.delete({ where: { id: game.id } });
  res.status(204).end();
});

// Add a table (with its locked-in chip denominations) to a game.
gamesRouter.post("/:gameId/tables", async (req, res) => {
  const game = await getOwnedGame(req.params.gameId, req.user!.id);
  if (!game) return res.status(404).json({ error: "not found" });

  const parsed = tableCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const table = await prisma.table.create({
    data: {
      gameId: game.id,
      type: parsed.data.type,
      stakes: parsed.data.stakes ?? null,
      label: parsed.data.label ?? null,
      usesCents: parsed.data.usesCents ?? false,
      denominations: {
        create: parsed.data.denominations.map((d) => ({
          color: d.color,
          value: d.value,
          refPhotoId: d.refPhotoId ?? null,
        })),
      },
    },
    include: { denominations: true },
  });
  res.status(201).json(table);
});
