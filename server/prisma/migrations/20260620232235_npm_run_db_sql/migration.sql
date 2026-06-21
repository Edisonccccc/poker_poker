-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'host');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('texas_holdem', 'blackjack');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'checked_out');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('buy_in', 'reimbursement', 'tip', 'adjustment');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('player', 'dealer', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'host',
    "face_descriptor" DOUBLE PRECISION[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "photo_id" UUID,
    "face_descriptor" DOUBLE PRECISION[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealers" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "photo_id" UUID,
    "face_descriptor" DOUBLE PRECISION[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "label" TEXT,
    "game_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GameStatus" NOT NULL DEFAULT 'open',
    "retain_photos" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "type" "GameType" NOT NULL,
    "stakes" TEXT,
    "label" TEXT,
    "uses_cents" BOOLEAN NOT NULL DEFAULT false,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "status" "TableStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chip_denominations" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "color" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "ref_photo_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chip_denominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_sessions" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "checkin_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkout_at" TIMESTAMP(3),
    "chips_out" DECIMAL(12,2),
    "chip_method" TEXT,
    "chip_photo_id" UUID,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_sessions" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "dealer_id" UUID NOT NULL,
    "checkin_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkout_at" TIMESTAMP(3),
    "tips_total" DECIMAL(12,2),
    "tips_method" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "player_session_id" UUID,
    "dealer_session_id" UUID,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "host_costs" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "party_type" "PartyType" NOT NULL,
    "party_id" UUID,
    "label" TEXT,
    "checkin_at" TIMESTAMP(3),
    "checkin_amount" DECIMAL(12,2),
    "checkout_at" TIMESTAMP(3),
    "checkout_amount" DECIMAL(12,2),
    "net" DECIMAL(12,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "players_host_id_idx" ON "players"("host_id");

-- CreateIndex
CREATE INDEX "dealers_host_id_idx" ON "dealers"("host_id");

-- CreateIndex
CREATE INDEX "games_host_id_game_date_idx" ON "games"("host_id", "game_date");

-- CreateIndex
CREATE INDEX "tables_game_id_idx" ON "tables"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "chip_denominations_table_id_color_key" ON "chip_denominations"("table_id", "color");

-- CreateIndex
CREATE INDEX "player_sessions_table_id_idx" ON "player_sessions"("table_id");

-- CreateIndex
CREATE INDEX "dealer_sessions_table_id_idx" ON "dealer_sessions"("table_id");

-- CreateIndex
CREATE INDEX "ledger_entries_table_id_idx" ON "ledger_entries"("table_id");

-- CreateIndex
CREATE INDEX "ledger_entries_player_session_id_idx" ON "ledger_entries"("player_session_id");

-- CreateIndex
CREATE INDEX "ledger_entries_dealer_session_id_idx" ON "ledger_entries"("dealer_session_id");

-- CreateIndex
CREATE INDEX "host_costs_game_id_idx" ON "host_costs"("game_id");

-- CreateIndex
CREATE INDEX "settlements_game_id_idx" ON "settlements"("game_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chip_denominations" ADD CONSTRAINT "chip_denominations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chip_denominations" ADD CONSTRAINT "chip_denominations_ref_photo_id_fkey" FOREIGN KEY ("ref_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_chip_photo_id_fkey" FOREIGN KEY ("chip_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_sessions" ADD CONSTRAINT "dealer_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_sessions" ADD CONSTRAINT "dealer_sessions_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_player_session_id_fkey" FOREIGN KEY ("player_session_id") REFERENCES "player_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_dealer_session_id_fkey" FOREIGN KEY ("dealer_session_id") REFERENCES "dealer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_costs" ADD CONSTRAINT "host_costs_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
