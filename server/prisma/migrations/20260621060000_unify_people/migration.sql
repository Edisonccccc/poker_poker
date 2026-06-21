-- Unify people: dealers become people (players). Non-destructive: copy dealer
-- records into players (reusing the same id) and repoint dealer_sessions to
-- players. The old dealers table is kept but no longer referenced.

INSERT INTO "players" (id, host_id, name, photo_id, roles, face_descriptor, created_at)
SELECT
  d.id,
  d.host_id,
  d.name,
  d.photo_id,
  CASE WHEN 'dealer' = ANY(d.roles) THEN d.roles ELSE array_append(d.roles, 'dealer') END,
  d.face_descriptor,
  d.created_at
FROM "dealers" d
ON CONFLICT (id) DO NOTHING;

ALTER TABLE "dealer_sessions" DROP CONSTRAINT IF EXISTS "dealer_sessions_dealer_id_fkey";
ALTER TABLE "dealer_sessions"
  ADD CONSTRAINT "dealer_sessions_dealer_id_fkey"
  FOREIGN KEY ("dealer_id") REFERENCES "players"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
