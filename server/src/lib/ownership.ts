import { prisma } from "../db";

/** Returns the game if owned by userId, else null. */
export function getOwnedGame(id: string, userId: string) {
  return prisma.game.findFirst({ where: { id, hostId: userId } });
}

/** Returns the table if its game is owned by userId, else null. */
export function getOwnedTable(id: string, userId: string) {
  return prisma.table.findFirst({ where: { id, game: { hostId: userId } } });
}

/** Returns the player session if its game is owned by userId, else null. */
export function getOwnedPlayerSession(id: string, userId: string) {
  return prisma.playerSession.findFirst({
    where: { id, table: { game: { hostId: userId } } },
  });
}

/** Returns the dealer session if its game is owned by userId, else null. */
export function getOwnedDealerSession(id: string, userId: string) {
  return prisma.dealerSession.findFirst({
    where: { id, table: { game: { hostId: userId } } },
  });
}
