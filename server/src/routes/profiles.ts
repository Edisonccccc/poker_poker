import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  photoId: z.string().uuid().nullable().optional(),
  faceDescriptor: z.array(z.number()).max(512).optional(),
});

const SELECT = { id: true, name: true, photoId: true, createdAt: true };

/**
 * CRUD for a reusable profile kind (players or dealers). Player and dealer have
 * an identical surface here, so we share one router and pick the Prisma delegate
 * by kind.
 */
export function createProfileRouter(kind: "player" | "dealer") {
  const router = Router();
  router.use(requireAuth);

  // reason: prisma.player and prisma.dealer share the same delegate shape; index
  // dynamically rather than duplicate the whole router for each kind.
  const delegate = (prisma as any)[kind];

  router.get("/", async (req, res) => {
    const rows = await delegate.findMany({
      where: { hostId: req.user!.id },
      select: SELECT,
      orderBy: { name: "asc" },
    });
    res.json(rows);
  });

  // Face descriptors for client-side matching. Registered before "/:id".
  router.get("/descriptors", async (req, res) => {
    const rows = await delegate.findMany({
      where: { hostId: req.user!.id },
      select: { id: true, name: true, photoId: true, faceDescriptor: true },
    });
    res.json(rows);
  });

  router.post("/", async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const row = await delegate.create({
      data: { ...parsed.data, hostId: req.user!.id },
      select: SELECT,
    });
    res.status(201).json(row);
  });

  router.get("/:id", async (req, res) => {
    const row = await delegate.findFirst({
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
    const existing = await delegate.findFirst({
      where: { id: req.params.id, hostId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: "not found" });
    const row = await delegate.update({
      where: { id: req.params.id },
      data: parsed.data,
      select: SELECT,
    });
    res.json(row);
  });

  router.delete("/:id", async (req, res) => {
    const existing = await delegate.findFirst({
      where: { id: req.params.id, hostId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: "not found" });

    // Don't orphan game history — block deletion if this profile has sessions.
    // reason: dynamic delegate by kind, same rationale as above.
    const sessionDelegate = (prisma as any)[`${kind}Session`];
    const sessionCount = await sessionDelegate.count({
      where: { [`${kind}Id`]: existing.id },
    });
    if (sessionCount > 0) {
      return res
        .status(409)
        .json({ error: "can't delete: this profile has game history" });
    }

    // Delete the profile first (clears the FK), then its photo. Array form keeps
    // both in one transaction without an implicitly-typed callback param.
    const ops = [delegate.delete({ where: { id: req.params.id } })];
    if (existing.photoId) {
      ops.push(prisma.photo.delete({ where: { id: existing.photoId } }));
    }
    await prisma.$transaction(ops);
    res.status(204).end();
  });

  return router;
}
