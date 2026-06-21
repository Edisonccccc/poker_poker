import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import { env } from "./env";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { photosRouter } from "./routes/photos";
import { createPeopleRouter } from "./routes/people";
import { gamesRouter } from "./routes/games";
import { tablesRouter } from "./routes/tables";
import { sessionsRouter } from "./routes/sessions";
import { afterGameRouter } from "./routes/afterGame";
import { chipsRouter } from "./routes/chips";
import { statsRouter } from "./routes/stats";
import { adminRouter } from "./routes/admin";

const app = express();

app.use(cors());
// Photos travel as base64 JSON for now (stored as bytea); allow larger bodies.
app.use(express.json({ limit: "12mb" }));

// API routes
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/photos", photosRouter);
app.use("/api/people", createPeopleRouter());
app.use("/api/games", gamesRouter);
app.use("/api/tables", tablesRouter);
app.use("/api", sessionsRouter);
app.use("/api", afterGameRouter);
app.use("/api", chipsRouter);
app.use("/api", statsRouter);
app.use("/api", adminRouter);

// Serve the built client in production (single Render web service).
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(env.PORT, () => {
  console.log(`PokerPoker server listening on http://localhost:${env.PORT}`);
});
