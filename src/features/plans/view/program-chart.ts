import { addDays, parseIsoDate } from "../model/dates";
import type { ProgramWeek } from "./program";

const month = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export type ChartMonth = { label: string; start: number; span: number };

export function chartMonths(weeks: Pick<ProgramWeek, "weekStart">[]) {
  const months: ChartMonth[] = [];
  weeks.forEach((week, index) => {
    const label = month.format(parseIsoDate(week.weekStart));
    const last = months.at(-1);
    if (last?.label === label) last.span += 1;
    else months.push({ label, start: index, span: 1 });
  });
  return months;
}

export function chartRange(weeks: Pick<ProgramWeek, "weekStart">[]) {
  const first = weeks[0];
  const last = weeks.at(-1);
  if (!first || !last) return null;
  return `${dayMonth.format(parseIsoDate(first.weekStart))} → ${dayMonth.format(parseIsoDate(addDays(last.weekStart, 6)))}`;
}

export function chartTicks(count: number, selected: number) {
  const ticks = new Set<number>([0, selected]);
  for (let number = 5; number <= count; number += 5) ticks.add(number - 1);
  return ticks;
}
