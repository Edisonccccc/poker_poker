/**
 * Reset a host/admin account password.
 *   npm -w server run reset-password -- you@example.com newpassword
 * Uses DATABASE_URL from the repo .env (local) or the process env (Render).
 */
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error(
      "Usage: npm -w server run reset-password -- <email> <newPassword>",
    );
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
    console.log(`✓ Password reset for ${user.email} (role: ${user.role})`);
  } catch {
    console.error(`No account found with email "${email}".`);
    const all = await prisma.user.findMany({ select: { email: true } });
    console.error("Existing accounts:", all.map((u) => u.email).join(", "));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
