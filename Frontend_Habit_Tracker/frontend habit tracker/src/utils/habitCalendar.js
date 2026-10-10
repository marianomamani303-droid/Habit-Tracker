export const HABIT_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function habitToday(timeZone = HABIT_TIME_ZONE) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone }).format(new Date());
}
