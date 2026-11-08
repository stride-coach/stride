import type { PlanBlock } from "./plan";

export function weekKey(weekStart: string) {
  return `w-${weekStart}`;
}

export function blockKey(kind: PlanBlock["kind"], ordinal: number) {
  return `b-${kind.replace("_", "-")}-${ordinal}`;
}

export function sessionKey(
  scheduledOn: string,
  existingKeys: Iterable<string>,
) {
  const taken = new Set(existingKeys);
  for (let slot = 1; ; slot += 1) {
    const candidate = `s-${scheduledOn}-${slot}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function sessionSlot(key: string) {
  const match = /-(\d+)$/.exec(key);
  return match ? Number(match[1]) : 0;
}

export function compareSessions(
  first: { scheduledOn: string; sessionKey: string },
  second: { scheduledOn: string; sessionKey: string },
) {
  return (
    first.scheduledOn.localeCompare(second.scheduledOn) ||
    sessionSlot(first.sessionKey) - sessionSlot(second.sessionKey) ||
    first.sessionKey.localeCompare(second.sessionKey)
  );
}

export function sessionKeyDate(key: string) {
  const match = /^s-(\d{4}-\d{2}-\d{2})-\d+$/.exec(key);
  return match ? match[1] : null;
}
