import { Router } from "express";
import { prisma } from "../db";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  res.json({ status: "ok", db });
});
