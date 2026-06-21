import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";

const ROLES = ["player", "dealer", "host", "admin"] as const;

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  photoId: z.string().uuid().nullable().optional(),
  roles: z.array(z.enum(ROLES)).optional(),
  faceDescriptor: z.array(z.number()).max(512).optional(),
});

const SELECT = {
  id: true,
  name: true,
  photoId: true,
  roles: true,
  createdAt: true,
};

/** Single "People" list. Each person can hold multiple roles. */
export function createPeopleRouter() {
  const router = Router();
  router.use(requireAuth);

  function roleFilter(req: { query: any }) {
    const role = typeof req.query.role === "string" ? req.query.role : null;
    return role ? { roles: { has: role } } : {};
  }

  router.get("/", async (req, res) => {
    const rows = await prisma.player.findMany({
      where: { hostId: req.user!.id, ...roleFilter(req) },
      select: SELECT,
      orderBy: { name: "asc" },
    });
    res.json(rows);
  });

  router.get("/descriptors", async (req, res) => {
    const rows = await prisma.player.findMany({
      where: { hostId: req.user!.id, ...roleFilter(req) },
      select: { id: true, name: true, photoId: true, faceDescriptor: true },
    });
    res.json(rows);
  });

  router.post("/", async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const row = await prisma.player.create({
      data: {
        ...parsed.data,
        roles: parsed.data.roles ?? ["player"],
        hostId: req.user!.id,
      },
      select: SELECT,
    });
    res.status(201).json(row);
  });

  router.get("/:id", async (req, res) => {
    const row = await prisma.player.findFirst({
      where: { id: req.params.id, hostId: req.user!.id },
      select: SELECT,
    });
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(row);
  });

  router.patch("/:id", async (req, res) => {
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const existing = await prisma.player.findFirst({
      where: { id: req.params.id, hostId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: "not found" });
    const row = await prisma.player.update({
      where: { id: existing.id },
      data: parsed.data,
      select: SELECT,
    });
    res.json(row);
  });

  router.delete("/:id", async (req, res) => {
    const existing = await prisma.player.findFirst({
      where: { id: req.params.id, hostId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: "not found" });

    const [asPlayer, asDealer] = await Promise.all([
      prisma.playerSession.count({ where: { playerId: existing.id } }),
      prisma.dealerSession.count({ where: { dealerId: existing.id } }),
    ]);
    if (asPlayer + asDealer > 0) {
      return res
        .status(409)
        .json({ error: "can't delete: this person has game history" });
    }

    const ops: any[] = [prisma.player.delete({ where: { id: existing.id } })];
    if (existing.photoId) {
      ops.push(prisma.photo.delete({ where: { id: existing.photoId } }));
    }
    await prisma.$transaction(ops);
    res.status(204).end();
  });

  return router;
}
