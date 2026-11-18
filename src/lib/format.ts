// Locale-aware formatting (money, numbers, dates, time left) lives in ./i18n.

export function percent(pledged: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.floor((pledged / goal) * 100);
}
