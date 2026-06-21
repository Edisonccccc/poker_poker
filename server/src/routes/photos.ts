import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../auth/middleware";

export const photosRouter = Router();
photosRouter.use(requireAuth);

const uploadSchema = z.object({
  data: z.string().min(1), // base64, no data: prefix
  mimeType: z.string().regex(/^image\//, "must be an image mime type"),
});

// Upload an image → stored as bytea. Returns the new photo id.
photosRouter.post("/", async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const buffer = Buffer.from(parsed.data.data, "base64");
  const photo = await prisma.photo.create({
    data: { data: buffer, mimeType: parsed.data.mimeType },
    select: { id: true },
  });
  res.status(201).json(photo);
});

// Stream image bytes. Auth-gated; ids are unguessable UUIDs.
// (v1 simplification: any authed host may read any photo by id.)
photosRouter.get("/:id", async (req, res) => {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!photo) return res.status(404).json({ error: "not found" });
  res.setHeader("Content-Type", photo.mimeType);
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.send(Buffer.from(photo.data));
});
