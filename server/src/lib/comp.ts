/** Hours a player session lasted (to checkout, or to now if still active). */
export function sessionHours(
  checkinAt: Date | string,
  checkoutAt: Date | string | null,
): number {
  const end = checkoutAt ? new Date(checkoutAt).getTime() : Date.now();
  return Math.max(0, (end - new Date(checkinAt).getTime()) / 3_600_000);
}

/** Comp hours: actual duration rounded UP to the next whole hour. */
export function compHours(
  checkinAt: Date | string,
  checkoutAt: Date | string | null,
): number {
  return Math.ceil(sessionHours(checkinAt, checkoutAt));
}

/** Optional hourly time-comp the host returns to a player (0 if disabled). */
export function sessionComp(s: {
  hourlyReturn: boolean;
  hourlyRate: unknown;
  checkinAt: Date | string;
  checkoutAt: Date | string | null;
}): number {
  if (!s.hourlyReturn) return 0;
  return Number(s.hourlyRate) * compHours(s.checkinAt, s.checkoutAt);
}
