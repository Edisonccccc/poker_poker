import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";
import { getOwnedTable } from "../lib/ownership";

export const tablesRouter = Router();
tablesRouter.use(requireAuth);

const tableUpdateSchema = z.object({
  label: z.string().max(80).nullable().optional(),
  stakes: z.string().max(40).nullable().optional(),
  status: z.enum(["open", "closed"]).optional(),
});

// One table with its denominations.
tablesRouter.get("/:id", async (req, res) => {
  const table = await prisma.table.findFirst({
    where: { id: req.params.id, game: { hostId: req.user!.id } },
    include: { denominations: { orderBy: { value: "desc" } } },
  });
  if (!table) return res.status(404).json({ error: "not found" });
  res.json(table);
});

tablesRouter.patch("/:id", async (req, res) => {
  const parsed = tableUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const table = await getOwnedTable(req.params.id, req.user!.id);
  if (!table) return res.status(404).json({ error: "not found" });

  const data: any = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label;
  if (parsed.data.stakes !== undefined) data.stakes = parsed.data.stakes;
  if (parsed.data.status) {
    data.status = parsed.data.status;
    data.closedAt = parsed.data.status === "closed" ? new Date() : null;
  }

  const updated = await prisma.table.update({
    where: { id: table.id },
    data,
    include: { denominations: { orderBy: { value: "desc" } } },
  });
  res.json(updated);
});

tablesRouter.delete("/:id", async (req, res) => {
  const table = await getOwnedTable(req.params.id, req.user!.id);
  if (!table) return res.status(404).json({ error: "not found" });
  await prisma.table.delete({ where: { id: table.id } });
  res.status(204).end();
});
