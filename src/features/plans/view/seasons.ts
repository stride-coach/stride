import {
  calendarBand,
  kmEffort,
  type RaceKind,
} from "@/features/races/calendar";
import { addDays, daysBetween, mondayOf } from "../model/dates";
import type { PlanState } from "../model/plan";

export const openSeasonId = "open";
export const openSeasonName = "Hors objectif";

export type SeasonStatus = "past" | "current" | "future";

export type SeasonRace = {
  id: string;
  name: string;
  date: string | null;
  priority: "A" | "B" | "C" | null;
  distanceKm: number | null;
  elevationGainM: number | null;
  kind: RaceKind;
};

export type PlanSeason = {
  id: string;
  raceId: string | null;
  name: string;
  letter: "A" | "B" | "C" | null;
  startsOn: string;
  endsOn: string;
  raceDate: string | null;
  status: SeasonStatus;
  weekStarts: string[];
  raceIds: string[];
  currentWeek: number | null;
};

type DatedRace = SeasonRace & { date: string };

function recoveryEndsOn(race: DatedRace) {
  if (race.distanceKm === null) return race.date;
  const effort = kmEffort(race.distanceKm, race.elevationGainM, race.kind);
  return addDays(race.date, calendarBand(effort).recoveryDays);
}

function objectivesOf(state: PlanState, races: DatedRace[], first: string) {
  const last = addDays(state.weeks.at(-1)!.weekStart, 6);
  const primary =
    races.find((race) => race.id === state.plan.primaryRaceId) ?? null;
  const main = races.filter(
    (race) =>
      race.priority === "A" &&
      race.date >= first &&
      (race.date <= last || race.id === primary?.id),
  );
  if (main.length > 0) return main;
  return primary && primary.date >= first ? [primary] : [];
}

export function planSeasons({
  state,
  races,
  today,
}: {
  state: PlanState;
  races: SeasonRace[];
  today: string;
}): PlanSeason[] {
  const weekStarts = state.weeks.map((week) => week.weekStart).sort();
  if (weekStarts.length === 0) return [];
  const dated = races
    .filter((race): race is DatedRace => race.date !== null)
    .sort((first, second) => first.date.localeCompare(second.date));
  const objectives = objectivesOf(state, dated, weekStarts[0]).map(
    (race, index, all) => {
      const next = all[index + 1];
      const recovery = recoveryEndsOn(race);
      const cap = next ? addDays(mondayOf(next.date), -1) : recovery;
      return {
        race,
        endsOn: cap < race.date || recovery < cap ? recovery : cap,
      };
    },
  );
  const groups: { race: DatedRace | null; weekStarts: string[] }[] = [];
  for (const weekStart of weekStarts) {
    const race =
      objectives.find((item) => item.endsOn >= weekStart)?.race ?? null;
    const last = groups.at(-1);
    if (last && last.race?.id === race?.id) last.weekStarts.push(weekStart);
    else groups.push({ race, weekStarts: [weekStart] });
  }
  return groups.map(({ race, weekStarts: own }) => {
    const startsOn = own[0];
    const endsOn = addDays(own.at(-1)!, 6);
    const status: SeasonStatus =
      today > endsOn ? "past" : today < startsOn ? "future" : "current";
    const currentWeek =
      status === "current"
        ? own.filter((weekStart) => weekStart <= today).length
        : null;
    return {
      id: race?.id ?? openSeasonId,
      raceId: race?.id ?? null,
      name: race?.name ?? openSeasonName,
      letter: race ? (race.priority ?? "A") : null,
      startsOn,
      endsOn,
      raceDate: race?.date ?? null,
      status,
      weekStarts: own,
      raceIds: dated
        .filter((item) => item.date >= startsOn && item.date <= endsOn)
        .map((item) => item.id),
      currentWeek,
    };
  });
}

type SeasonRange = Pick<
  PlanSeason,
  "id" | "raceIds" | "startsOn" | "endsOn" | "status"
>;

export function defaultSeason<Season extends SeasonRange>(
  seasons: Season[],
): Season | null {
  return (
    seasons.find((season) => season.status === "current") ??
    seasons.find((season) => season.status === "future") ??
    seasons.at(-1) ??
    null
  );
}

export function seasonFor<Season extends SeasonRange>(
  seasons: Season[],
  {
    season = null,
    race = null,
    week = null,
    session = null,
  }: {
    season?: string | null;
    race?: string | null;
    week?: string | null;
    session?: string | null;
  },
): Season | null {
  const containing = (date: string | null) =>
    date === null
      ? undefined
      : seasons.find((item) => item.startsOn <= date && date <= item.endsOn);
  return (
    seasons.find((item) => season !== null && item.id === season) ??
    seasons.find((item) => race !== null && item.id === race) ??
    seasons.find((item) => race !== null && item.raceIds.includes(race)) ??
    containing(week) ??
    containing(session) ??
    defaultSeason(seasons)
  );
}

export function seasonHref(seasons: SeasonRange[], id: string) {
  return defaultSeason(seasons)?.id === id ? "/plan" : `/plan?season=${id}`;
}

export function seasonProgress(
  season: Pick<PlanSeason, "raceId" | "status" | "weekStarts" | "currentWeek">,
) {
  const count = season.weekStarts.length;
  if (season.currentWeek !== null) return `S${season.currentWeek} / ${count}`;
  return season.status === "past" && season.raceId !== null
    ? "Terminée"
    : `${count} sem.`;
}

export function seasonCountdown(
  season: Pick<PlanSeason, "raceDate">,
  today: string,
) {
  if (season.raceDate === null || season.raceDate < today) return null;
  return `J-${daysBetween(today, season.raceDate)}`;
}
