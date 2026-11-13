import { z } from "zod";
import type { PlanBlock } from "@/features/plans/model/plan";
import type { ProgramOverview } from "@/features/plans/view/program";
import { addDays } from "@/features/progress/period";
import { gearReadiness, type ChecklistItem } from "./checklists";
import { formatDuration } from "./format";
import {
  daysUntil,
  formatShortDate,
  type RacePlan,
  type RaceSummary,
  type StoredCourse,
} from "./race";
import { isStation, type Waypoint } from "./waypoints";

export const racesViews = ["upcoming", "past", "all"] as const;
export type RacesView = (typeof racesViews)[number];

export const racesViewLabels: Record<RacesView, string> = {
  upcoming: "À venir",
  past: "Passées",
  all: "Toutes",
};

const viewSchema = z.enum(racesViews).catch("upcoming");

export function parseRacesView(value: unknown): RacesView {
  return viewSchema.parse(Array.isArray(value) ? value[0] : value);
}

export function racesViewHref(view: RacesView) {
  return view === "upcoming" ? "/races" : `/races?view=${view}`;
}

const priorityRank = { A: 0, B: 1, C: 2 } as const;

export function splitRaces(races: RaceSummary[], today: string) {
  const isPast = (race: RaceSummary) => race.date !== null && race.date < today;
  const upcoming = races
    .filter((race) => !isPast(race))
    .sort((a, b) => {
      if (a.date === null || b.date === null)
        return Number(a.date === null) - Number(b.date === null);
      return a.date.localeCompare(b.date);
    });
  const past = races
    .filter(isPast)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string));
  const featured =
    [...upcoming].sort(
      (a, b) => priorityRank[a.priority] - priorityRank[b.priority],
    )[0] ?? null;
  return {
    upcoming,
    past,
    featured,
    calendar: upcoming.filter((race) => race.id !== featured?.id),
  };
}

export type PlanPhase = {
  key: string;
  label: string;
  kind: PlanBlock["kind"] | null;
  start: string;
  end: string;
};

const phaseStages: Record<PlanBlock["kind"], number> = {
  lead_in: 0,
  base: 1,
  build: 1,
  specific: 2,
  taper: 3,
  race: 3,
  recovery: 0,
  transition: 0,
};

export function planPhases(
  program: Pick<ProgramOverview, "blocks"> | null,
  blockKinds: Record<string, PlanBlock["kind"]>,
): PlanPhase[] {
  return (program?.blocks ?? []).flatMap((block) => {
    const first = block.weeks[0];
    const last = block.weeks[block.weeks.length - 1];
    return first && last
      ? [
          {
            key: block.blockKey,
            label: block.name,
            kind: blockKinds[block.blockKey] ?? null,
            start: first.weekStart,
            end: addDays(last.weekStart, 7),
          },
        ]
      : [];
  });
}

const dayMs = 86_400_000;

function epoch(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

const monthLabel = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});

const monthName = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: "UTC",
});

function fromMonth(time: number) {
  const name = monthName.format(new Date(time));
  return /^[aeiou]/.test(name) ? `d’${name}` : `de ${name}`;
}

export const timelineWidthPx = 896;
export const seasonRailWidthPx = 260;
const monthGapPx = 6;

const lanePaddingPx = 16;

function textWidthPx(text: string, charPx: number) {
  return text.length * charPx;
}

export type TimelineMarker = {
  id: string;
  name: string;
  priority: RaceSummary["priority"];
  date: string;
  label: string;
  short: string;
  left: number;
  lane: number;
  align: "start" | "center" | "end";
};

export type SeasonTimeline = {
  range: string;
  today: number;
  months: { key: string; label: string; left: number; labelled: boolean }[];
  phases: {
    key: string;
    label: string;
    stage: number;
    left: number;
    width: number;
    labelled: boolean;
  }[];
  markers: TimelineMarker[];
  lanes: number;
};

function markerLanes(
  markers: Omit<TimelineMarker, "lane" | "align">[],
): TimelineMarker[] {
  const laneEnds: number[] = [];
  return markers.map((marker) => {
    const x = (marker.left / 100) * timelineWidthPx;
    const width = textWidthPx(marker.label, 7) + 36;
    const align =
      marker.left < 12 ? "start" : marker.left > 88 ? "end" : "center";
    const from =
      align === "start" ? x : align === "end" ? x - width : x - width / 2;
    const lane = laneEnds.findIndex((end) => end + lanePaddingPx <= from);
    const chosen = lane === -1 ? laneEnds.length : lane;
    laneEnds[chosen] = from + width;
    return { ...marker, lane: chosen, align };
  });
}

export function seasonTimeline(
  races: RaceSummary[],
  today: string,
  planned: PlanPhase[] = [],
): SeasonTimeline | null {
  const dated = races
    .filter(
      (race): race is RaceSummary & { date: string } =>
        race.date !== null && race.date >= today,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (dated.length === 0) return null;
  const now = new Date(epoch(today));
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const lastDay = new Date(epoch(dated[dated.length - 1].date));
  const end = Math.max(
    Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth() + 1, 15),
    epoch(today) + 60 * dayMs,
  );
  const span = end - start;
  const at = (time: number) =>
    Math.min(100, Math.max(0, ((time - start) / span) * 100));
  const months: SeasonTimeline["months"] = [];
  let labelEnd = -Infinity;
  let month = start;
  while (month < end) {
    const label = monthLabel.format(new Date(month));
    const left = at(month);
    const x = (left / 100) * seasonRailWidthPx;
    const labelled = x >= labelEnd + monthGapPx;
    if (labelled) labelEnd = x + textWidthPx(label, 6);
    months.push({
      key: new Date(month).toISOString().slice(0, 7),
      label,
      left,
      labelled,
    });
    const next = new Date(month);
    month = Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 1);
  }
  const phases: SeasonTimeline["phases"] = planned.flatMap((phase) => {
    const from = Math.max(start, epoch(phase.start));
    const to = Math.min(end, epoch(phase.end));
    if (to <= from) return [];
    const width = at(to) - at(from);
    return [
      {
        key: phase.key,
        label: phase.label,
        stage: phase.kind ? phaseStages[phase.kind] : 0,
        left: at(from),
        width,
        labelled:
          (width / 100) * timelineWidthPx >= textWidthPx(phase.label, 6) + 14,
      },
    ];
  });
  const markers = markerLanes(
    dated.map((race) => ({
      id: race.id,
      name: race.name,
      priority: race.priority,
      date: race.date,
      label: `${race.name} · ${formatShortDate(race.date)}`,
      short: formatShortDate(race.date),
      left: at(epoch(race.date)),
    })),
  );
  return {
    range: `${fromMonth(start)} à ${monthName.format(new Date(end - dayMs))}`,
    today: at(epoch(today)),
    months,
    phases,
    markers,
    lanes: Math.max(1, ...markers.map((marker) => marker.lane + 1)),
  };
}

export type PreparationRow = {
  key: string;
  label: string;
  detail: string;
  state: "done" | "partial" | "todo";
  href: string | null;
};

type OverviewInput = {
  race: RaceSummary;
  plan: RacePlan;
  course: StoredCourse | null;
  waypoints: Waypoint[];
  checklist: ChecklistItem[];
};

export function preparationRows({
  race,
  plan,
  course,
  waypoints,
  checklist,
}: OverviewInput): PreparationRow[] {
  const base = `/races/${race.id}`;
  const trail = race.kind === "trail";
  const stations = waypoints.filter((waypoint) => isStation(waypoint.kind));
  const gear = gearReadiness(checklist);
  const rows: PreparationRow[] = [
    {
      key: "course",
      label: "GPX importé",
      detail: course ? (course.fileName ?? "Parcours importé") : "à importer",
      state: course ? "done" : "todo",
      href: `${base}/course`,
    },
  ];
  if (trail)
    rows.push({
      key: "waypoints",
      label: "Points de passage",
      detail: waypoints.length
        ? `${waypoints.length} dont ${stations.length} ${stations.length > 1 ? "ravitos" : "ravito"}`
        : "à renseigner",
      state: waypoints.length ? "done" : "todo",
      href: `${base}/waypoints`,
    });
  rows.push(
    {
      key: "target",
      label: "Objectif de temps",
      detail: race.targetSeconds
        ? formatDuration(race.targetSeconds)
        : "à définir",
      state: race.targetSeconds ? "done" : "todo",
      href: null,
    },
    {
      key: "start",
      label: "Heure de départ",
      detail: plan.startConfirmed ? "confirmée" : "à confirmer",
      state: plan.startConfirmed ? "done" : "todo",
      href: null,
    },
  );
  if (trail) {
    rows.push(
      {
        key: "gear",
        label: "Équipement",
        detail: gear.total ? `${gear.ready} sur ${gear.total}` : "à préparer",
        state:
          gear.total === 0 || gear.ready === 0
            ? "todo"
            : gear.ready === gear.total
              ? "done"
              : "partial",
        href: `${base}/gear`,
      },
      {
        key: "watch",
        label: "Alertes montre",
        detail: waypoints.some((waypoint) => waypoint.watchLabel)
          ? "configurées"
          : "à configurer",
        state: waypoints.some((waypoint) => waypoint.watchLabel)
          ? "done"
          : "todo",
        href: `${base}/waypoints#montre`,
      },
    );
  }
  return rows;
}

const nextSteps: Record<string, string> = {
  course: "Importe le GPX pour calculer le profil, le dénivelé et la nuit.",
  waypoints: "Place les ravitos et les barrières horaires sur le parcours.",
  target: "Renseigne un temps objectif pour projeter les passages.",
  start: "Confirme l’heure de départ pour fixer la nuit et la météo.",
  gear: "Complète la liste d’équipement avant les sorties de test.",
  watch: "Configure les alertes de ravitos pour la montre.",
};

export function preparationProgress(rows: PreparationRow[]) {
  const done = rows.filter((row) => row.state === "done").length;
  const pending = rows.find((row) => row.state !== "done") ?? null;
  return {
    done,
    total: rows.length,
    next: pending ? (nextSteps[pending.key] ?? null) : null,
    nextHref: pending?.href ?? null,
  };
}

export function countdownLabel(date: string | null, today: string) {
  if (!date) return null;
  const days = daysUntil(date, today);
  if (days < 0) return null;
  return days === 0 ? "Jour J" : `J-${days}`;
}

export function pastYears(races: Pick<RaceSummary, "date">[]) {
  const years = races
    .flatMap((race) => (race.date ? [Number(race.date.slice(0, 4))] : []))
    .sort((left, right) => left - right);
  const first = years[0];
  const last = years.at(-1);
  if (first === undefined || last === undefined) return null;
  return first === last ? `${first}` : `${first}–${last}`;
}
