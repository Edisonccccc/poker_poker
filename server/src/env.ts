import path from "node:path";
import dotenv from "dotenv";

// Load the single root .env regardless of the process cwd.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
  // Server-side key for the vision model used by chip/tip counting (Milestone 7).
  VISION_API_KEY: process.env.VISION_API_KEY ?? "",
  // Anthropic vision model used for chip counting; override if needed.
  VISION_MODEL: process.env.VISION_MODEL ?? "claude-opus-4-8",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
