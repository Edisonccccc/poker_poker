import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { hashPassword, verifyPassword } from "../auth/password";
import { signToken, type Role } from "../auth/jwt";
import { requireAuth } from "../auth/middleware";

export const authRouter = Router();

// Accounts log in with a username (their name). We store it in the unique
// `email` column (the login key) so no schema change is needed. The display
// name defaults to the username.
const registerSchema = z.object({
  username: z.string().min(1, "name is required").max(80),
  password: z.string().min(8, "password must be at least 8 characters"),
});

const loginSchema = z.object({
  username: z.string().min(1),
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
  // `email` doubles as the username/login key.
  return {
    id: u.id,
    username: u.email,
    displayName: u.displayName,
    role: u.role,
  };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const username = parsed.data.username.trim();
  const { password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: username } });
  if (existing) {
    return res.status(409).json({ error: "username already taken" });
  }

  // The very first account becomes the admin; everyone else is a host.
  const isFirst = (await prisma.user.count()) === 0;

  const user = await prisma.user.create({
    data: {
      email: username,
      passwordHash: await hashPassword(password),
      displayName: username,
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
  const username = parsed.data.username.trim();
  const { password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid username or password" });
  }

  const token = signToken({ sub: user.id, role: user.role as Role });
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json({ user: publicUser(user) });
});
