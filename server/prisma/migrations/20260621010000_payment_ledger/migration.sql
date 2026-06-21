-- Add a 'payment' ledger type for recording cash sent to / received from a player.
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'payment';
