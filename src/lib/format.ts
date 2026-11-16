export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function percent(pledged: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.floor((pledged / goal) * 100);
}

/** e.g. { value: "6", unit: "days to go" } */
export function timeLeft(deadline: number | null, now = Date.now()): { value: string; unit: string } {
  if (!deadline) return { value: "—", unit: "not launched" };
  const ms = deadline - now;
  if (ms <= 0) return { value: "0", unit: "ended" };
  const hours = ms / 3_600_000;
  if (hours < 1) return { value: String(Math.max(1, Math.ceil(ms / 60_000))), unit: "minutes to go" };
  if (hours < 48) return { value: String(Math.floor(hours)), unit: Math.floor(hours) === 1 ? "hour to go" : "hours to go" };
  return { value: String(Math.floor(hours / 24)), unit: "days to go" };
}

export function shortTimeLeft(deadline: number | null, now = Date.now()): string {
  const t = timeLeft(deadline, now);
  if (t.unit === "ended") return "Ended";
  if (t.unit === "not launched") return "Draft";
  return `${t.value} ${t.unit.replace(" to go", "")} left`;
}

export function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
