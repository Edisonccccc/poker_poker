-- Insurance: player premium in + payout on bad beat; folds into profit.
CREATE TABLE "insurance" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "player_id" UUID,
    "label" TEXT,
    "premium" DECIMAL(12,2) NOT NULL,
    "payout" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "insurance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_game_id_idx" ON "insurance"("game_id");

ALTER TABLE "insurance" ADD CONSTRAINT "insurance_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insurance" ADD CONSTRAINT "insurance_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
