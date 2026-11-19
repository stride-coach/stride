import { addDays, daysBetween, parseIsoDate } from "../model/dates";
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

export type ChartMonth = {
  label: string;
  start: number;
  span: number;
  seconds: number;
};

export function chartMonths(
  weeks: { weekStart: string; totals: { durationSeconds: number } }[],
) {
  const months: ChartMonth[] = [];
  weeks.forEach((week, index) => {
    const label = month.format(parseIsoDate(week.weekStart));
    const seconds = week.totals.durationSeconds;
    const last = months.at(-1);
    if (last?.label === label) {
      last.span += 1;
      last.seconds += seconds;
    } else months.push({ label, start: index, span: 1, seconds });
  });
  return months;
}

export function chartToday(
  weeks: { weekStart: string; totals: { durationSeconds: number } }[],
  today: string | null,
) {
  const first = weeks[0];
  if (!first || !today) return null;
  const days = daysBetween(first.weekStart, today);
  if (days < 0 || days >= weeks.length * 7) return null;
  const months = chartMonths(weeks);
  const week = Math.floor(days / 7);
  const index = months.findIndex(
    (item) => week >= item.start && week < item.start + item.span,
  );
  return {
    fraction: (days + 0.5) / (weeks.length * 7),
    label: dayMonth.format(parseIsoDate(today)),
    month: index + 1,
    months: months.length,
  };
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
