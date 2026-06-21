-- Percentage rebate: host returns a % of a player's loss when they're under water.
ALTER TABLE "player_sessions" ADD COLUMN "pct_rebate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "player_sessions" ADD COLUMN "pct_rate" DECIMAL(12,2) NOT NULL DEFAULT 10;
