-- Optional hourly time-comp the host returns to a player for their time at table.
ALTER TABLE "player_sessions" ADD COLUMN "hourly_return" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "player_sessions" ADD COLUMN "hourly_rate" DECIMAL(12,2) NOT NULL DEFAULT 25;
