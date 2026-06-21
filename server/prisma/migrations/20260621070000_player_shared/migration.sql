-- Allow an admin to mark a person as shared across all accounts.
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "shared" BOOLEAN NOT NULL DEFAULT false;
