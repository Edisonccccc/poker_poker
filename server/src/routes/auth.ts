import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { hashPassword, verifyPassword } from "../auth/password";
import { signToken, type Role } from "../auth/jwt";
import { requireAuth } from "../auth/middleware";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "password must be at least 8 characters"),
  displayName: z.string().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// reason: Prisma User type is only available after `prisma generate`; keep this
// helper structurally typed so it compiles before generation too.
function publicUser(u: {
  id: string;
  email: string;
  displayName: string;
  role: string;
}) {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "email already registered" });
  }

  // The very first account becomes the admin.
  const isFirst = (await prisma.user.count()) === 0;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      displayName: displayName ?? email.split("@")[0],
      role: isFirst ? "admin" : "host",
    },
  });

  const token = signToken({ sub: user.id, role: user.role as Role });
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const token = signToken({ sub: user.id, role: user.role as Role });
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json({ user: publicUser(user) });
});
