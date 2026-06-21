import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { env } from "../env";
import { requireAuth } from "../auth/middleware";
import { getOwnedTable } from "../lib/ownership";
import {
  countChips,
  VisionNotConfigured,
  type CountDenomination,
  type ImageData,
} from "../lib/visionCount";

export const chipsRouter = Router();
chipsRouter.use(requireAuth);

const schema = z.object({
  tableId: z.string().uuid(),
  photoId: z.string().uuid(),
});

function toImageData(photo: { data: unknown; mimeType: string }): ImageData {
  return {
    mediaType: photo.mimeType,
    data: Buffer.from(photo.data as Uint8Array).toString("base64"),
  };
}

chipsRouter.post("/chips/count", async (req, res) => {
  if (!env.VISION_API_KEY) {
    return res.status(503).json({
      error: "Photo counting isn't configured. Enter the count manually.",
    });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const table = await getOwnedTable(parsed.data.tableId, req.user!.id);
  if (!table) return res.status(404).json({ error: "table not found" });

  const countPhoto = await prisma.photo.findUnique({
    where: { id: parsed.data.photoId },
  });
  if (!countPhoto) return res.status(404).json({ error: "photo not found" });

  const denoms = await prisma.chipDenomination.findMany({
    where: { tableId: table.id },
    orderBy: { value: "desc" },
  });
  if (denoms.length === 0) {
    return res.status(400).json({ error: "table has no chip denominations" });
  }

  // Load reference photos referenced by the denominations.
  const refIds = denoms
    .map((d: any) => d.refPhotoId)
    .filter((id: string | null): id is string => Boolean(id));
  const refPhotos = await prisma.photo.findMany({
    where: { id: { in: refIds } },
  });
  const refById = new Map<string, any>(refPhotos.map((p: any) => [p.id, p]));

  const denominations: CountDenomination[] = denoms.map((d: any) => {
    const ref = d.refPhotoId ? refById.get(d.refPhotoId) : undefined;
    return {
      color: d.color,
      value: Number(d.value),
      ref: ref ? toImageData(ref) : undefined,
    };
  });

  try {
    const result = await countChips({
      countImage: toImageData(countPhoto),
      denominations,
    });
    res.json(result);
  } catch (e) {
    if (e instanceof VisionNotConfigured) {
      return res.status(503).json({ error: "Photo counting isn't configured." });
    }
    console.error("chip count failed", e);
    const detail = e instanceof Error ? e.message.slice(0, 400) : String(e);
    res.status(502).json({
      error: "Couldn't read the photo. Enter the count manually.",
      detail,
    });
  }
});
