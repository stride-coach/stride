export function weekTicks(total: number, current: number) {
  if (total <= 0) return [];
  const ticks = new Set<number>([0, total - 1]);
  for (let week = 4; week < total - 1; week += 5) ticks.add(week);
  if (current >= 0 && current < total) ticks.add(current);
  const sorted = [...ticks].sort((left, right) => left - right);
  return sorted.filter(
    (tick, index) =>
      tick === current ||
      tick === 0 ||
      tick === total - 1 ||
      ((sorted[index - 1] === undefined || tick - sorted[index - 1]! > 1) &&
        (sorted[index + 1] === undefined || sorted[index + 1]! - tick > 1)),
  );
}
