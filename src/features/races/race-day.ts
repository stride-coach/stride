import { z } from "zod";
import { formatClock, formatDuration, formatInteger, formatKm } from "./format";
import { localMinutes } from "./sun";
import type { WaypointKind } from "./waypoints";

export type RaceDayStation = {
  id: string;
  name: string;
  kind: WaypointKind;
  distanceM: number;
  arrivalSeconds: number;
  stopSeconds: number;
  cutoffSeconds: number | null;
  todo: string[];
};

export type RaceDayClimb = { fromM: number; toM: number; label: string };

export type RaceDayIntake = { atSeconds: number; label: string };

export type RaceDayPlan = {
  raceId: string;
  name: string;
  timeZone: string;
  startEpochMs: number;
  distanceM: number;
  stations: RaceDayStation[];
  climbs: RaceDayClimb[];
  intakes: RaceDayIntake[];
  nights: { fromSeconds: number; toSeconds: number }[];
  track: [elapsedSeconds: number, distanceM: number][];
};

export const raceDayCheckinSchema = z.object({
  waypointId: z.uuid(),
  checkedAt: z.number().int().positive(),
});

export type RaceDayCheckin = z.infer<typeof raceDayCheckinSchema>;

export type RaceDayRow = { label: string; value: string; aside: string | null };

export type RaceDayPassage = {
  id: string;
  name: string;
  detail: string;
  value: string;
  checked: boolean;
};

export type RaceDayView = {
  phase: "before" | "racing" | "finished";
  eyebrow: string;
  title: string;
  detail: string;
  updated: string;
  rows: RaceDayRow[];
  next: { id: string; name: string; kind: WaypointKind } | null;
  passages: RaceDayPassage[];
};

export type RaceDayCheckinSummary = {
  title: string;
  checked: string;
  planned: string;
  rows: RaceDayRow[];
  todo: string[];
};

export const checkableKinds: readonly WaypointKind[] = [
  "aid",
  "water",
  "base",
  "finish",
];

const minute = 60;

function km(meters: number) {
  return meters < 10_000
    ? formatKm(Math.round(meters / 100) * 100)
    : formatInteger(meters / 1000);
}

function clockAt(plan: RaceDayPlan, elapsedSeconds: number) {
  return clockOf(plan, plan.startEpochMs + elapsedSeconds * 1000);
}

function clockOf(plan: RaceDayPlan, epochMs: number) {
  return formatClock(localMinutes(epochMs, plan.timeZone));
}

export function formatGap(seconds: number) {
  const minutes = Math.round(seconds / minute);
  if (minutes === 0) return "±0";
  return `${minutes > 0 ? "+" : "−"}${formatDuration(Math.abs(minutes) * minute)}`;
}

export function gapSentence(seconds: number) {
  const minutes = Math.round(seconds / minute);
  if (minutes === 0) return "dans les temps du plan";
  const amount = formatDuration(Math.abs(minutes) * minute);
  return minutes > 0 ? `${amount} de retard` : `${amount} d’avance`;
}

export function checkpoints(plan: RaceDayPlan) {
  return plan.stations.filter((station) =>
    checkableKinds.includes(station.kind),
  );
}

function latestCheckin(plan: RaceDayPlan, checkins: readonly RaceDayCheckin[]) {
  const times = new Map(
    checkins.map((item) => [item.waypointId, item.checkedAt]),
  );
  const index = plan.stations.findLastIndex((station) => times.has(station.id));
  const station = plan.stations[index];
  const checkedAt = station ? times.get(station.id) : undefined;
  return {
    times,
    latest:
      station && checkedAt !== undefined ? { station, index, checkedAt } : null,
  };
}

export function offsetAt(
  plan: RaceDayPlan,
  station: RaceDayStation,
  checkedAt: number,
) {
  return (checkedAt - plan.startEpochMs) / 1000 - station.arrivalSeconds;
}

export function distanceAt(plan: RaceDayPlan, elapsedSeconds: number) {
  const { track } = plan;
  if (track.length === 0) return 0;
  if (elapsedSeconds <= track[0][0]) return track[0][1];
  for (let index = 1; index < track.length; index += 1) {
    const [toSeconds, toM] = track[index];
    if (elapsedSeconds <= toSeconds) {
      const [fromSeconds, fromM] = track[index - 1];
      const span = toSeconds - fromSeconds;
      return span > 0
        ? fromM + ((toM - fromM) * (elapsedSeconds - fromSeconds)) / span
        : toM;
    }
  }
  return plan.distanceM;
}

function terrainRow(
  plan: RaceDayPlan,
  distanceM: number,
  until: RaceDayStation,
): RaceDayRow | null {
  if (plan.climbs.length === 0) return null;
  const climb = plan.climbs.find(
    (item) => item.toM > distanceM && item.fromM < until.distanceM,
  );
  if (!climb)
    return {
      label: "Terrain",
      value: "Pas de côte à marcher",
      aside: `jusqu’à ${until.name}`,
    };
  return {
    label: "Terrain",
    value: climb.label,
    aside:
      climb.fromM <= distanceM ? "marche" : `marche au km ${km(climb.fromM)}`,
  };
}

function nightRow(
  plan: RaceDayPlan,
  elapsedSeconds: number,
): RaceDayRow | null {
  const night = plan.nights.find((item) => item.toSeconds > elapsedSeconds);
  if (!night) return null;
  if (night.fromSeconds <= elapsedSeconds)
    return {
      label: "Nuit",
      value: `Jusqu’à ${clockAt(plan, night.toSeconds)}`,
      aside: "frontale allumée",
    };
  return {
    label: "Nuit",
    value: `Dans ${formatDuration(night.fromSeconds - elapsedSeconds)}`,
    aside: "frontale prête",
  };
}

function barrierRow(
  plan: RaceDayPlan,
  from: number,
  offset: number,
  stillAhead: (station: RaceDayStation) => boolean,
): RaceDayRow | null {
  const barrier = plan.stations
    .slice(from)
    .find((station) => station.cutoffSeconds !== null && stillAhead(station));
  if (!barrier || barrier.cutoffSeconds === null) return null;
  const margin = barrier.cutoffSeconds - (barrier.arrivalSeconds + offset);
  return {
    label:
      barrier.kind === "finish"
        ? "Barrière de l’arrivée"
        : `Barrière de ${barrier.name}`,
    value:
      margin >= 0
        ? `Marge de ${formatDuration(margin)}`
        : `${formatDuration(-margin)} au-delà`,
    aside: clockAt(plan, barrier.cutoffSeconds),
  };
}

function passagesOf(
  plan: RaceDayPlan,
  times: Map<string, number>,
  offset: number,
): RaceDayPassage[] {
  return checkpoints(plan).map((station) => {
    const checkedAt = times.get(station.id);
    const where = `km ${km(station.distanceM)}`;
    if (checkedAt !== undefined)
      return {
        id: station.id,
        name: station.kind === "finish" ? "Arrivée" : station.name,
        detail: `${where} · pointé ${clockOf(plan, checkedAt)}`,
        value: formatGap(offsetAt(plan, station, checkedAt)),
        checked: true,
      };
    return {
      id: station.id,
      name: station.kind === "finish" ? "Arrivée" : station.name,
      detail:
        station.cutoffSeconds !== null && station.kind !== "finish"
          ? `${where} · barrière ${clockAt(plan, station.cutoffSeconds)}`
          : where,
      value: clockAt(plan, station.arrivalSeconds + offset),
      checked: false,
    };
  });
}

export function raceDayView(
  plan: RaceDayPlan,
  checkins: readonly RaceDayCheckin[],
  nowMs: number,
): RaceDayView {
  const { times, latest } = latestCheckin(plan, checkins);
  const offset = latest ? offsetAt(plan, latest.station, latest.checkedAt) : 0;
  const elapsed = (nowMs - plan.startEpochMs) / 1000;
  const passages = passagesOf(plan, times, offset);
  const finish = plan.stations[plan.stations.length - 1];
  const updated = latest
    ? `mis à jour à ${latest.station.name}, ${clockOf(plan, latest.checkedAt)}`
    : "d’après le plan";
  const nextStation =
    plan.stations
      .slice((latest?.index ?? 0) + 1)
      .find((station) => checkableKinds.includes(station.kind)) ?? null;
  const next = nextStation
    ? { id: nextStation.id, name: nextStation.name, kind: nextStation.kind }
    : null;

  if (latest && latest.station.kind === "finish") {
    return {
      phase: "finished",
      eyebrow: plan.name,
      title: `Arrivée pointée à ${clockOf(plan, latest.checkedAt)}`,
      detail: `${formatDuration((latest.checkedAt - plan.startEpochMs) / 1000)} de course · ${gapSentence(offset)}`,
      updated,
      rows: [],
      next: null,
      passages,
    };
  }

  if (elapsed < 0 && !latest) {
    const first = checkpoints(plan)[0];
    return {
      phase: "before",
      eyebrow: `Départ à ${clockAt(plan, 0)}`,
      title: `Départ dans ${formatDuration(-elapsed)}`,
      detail: `${km(plan.distanceM)} km · arrivée prévue vers ${clockAt(plan, finish.arrivalSeconds)}`,
      updated,
      rows: [
        ...(first
          ? [
              {
                label: "Premier ravito",
                value: `${first.name} au km ${km(first.distanceM)}`,
                aside: `vers ${clockAt(plan, first.arrivalSeconds)}`,
              },
            ]
          : []),
        ...[barrierRow(plan, 0, 0, () => true), nightRow(plan, 0)].filter(
          (row): row is RaceDayRow => row !== null,
        ),
      ],
      next,
      passages,
    };
  }

  const target = nextStation ?? finish;
  const adjusted = Math.max(0, elapsed - offset);
  const floor = latest?.station.distanceM ?? 0;
  const distanceM = Math.min(
    target.distanceM,
    Math.max(floor, distanceAt(plan, adjusted)),
  );
  const sectionEnd =
    plan.stations.find(
      (station, index) =>
        index > (latest?.index ?? 0) && station.distanceM >= distanceM,
    ) ?? finish;
  const sectionIndex = Math.max(1, plan.stations.indexOf(sectionEnd));
  const sectionStart = plan.stations[sectionIndex - 1];
  const intake = plan.intakes.find((item) => item.atSeconds + offset > elapsed);
  const rows = [
    terrainRow(plan, distanceM, sectionEnd),
    intake
      ? {
          label: "Prochaine prise",
          value: `${intake.label} dans ${formatDuration(intake.atSeconds + offset - elapsed)}`,
          aside: clockAt(plan, intake.atSeconds + offset),
        }
      : null,
    {
      label: target.kind === "finish" ? "Arrivée" : "Prochain ravito",
      value:
        target.distanceM - distanceM < 100
          ? `${target.kind === "finish" ? "Arrivée" : target.name} : tu devrais y être`
          : `${target.kind === "finish" ? "Arrivée" : target.name} dans ${km(target.distanceM - distanceM)} km`,
      aside: `vers ${clockAt(plan, target.arrivalSeconds + offset)}`,
    },
    barrierRow(
      plan,
      (latest?.index ?? 0) + 1,
      offset,
      (station) => !times.has(station.id),
    ),
    nightRow(plan, elapsed),
  ].filter((row): row is RaceDayRow => row !== null);

  return {
    phase: "racing",
    eyebrow: `Section ${sectionIndex} sur ${plan.stations.length - 1} · estimation`,
    title: `${sectionStart.name} → ${sectionEnd.kind === "finish" ? "Arrivée" : sectionEnd.name}`,
    detail: `km ${formatInteger(distanceM / 1000)} · ${formatDuration(Math.max(0, elapsed))} de course · ${gapSentence(offset)}${offset === 0 ? "" : " sur le plan"}`,
    updated,
    rows,
    next,
    passages,
  };
}

export function checkinSummary(
  plan: RaceDayPlan,
  stationId: string,
  checkedAt: number,
): RaceDayCheckinSummary | null {
  const index = plan.stations.findIndex((station) => station.id === stationId);
  const station = plan.stations[index];
  if (!station) return null;
  const offset = offsetAt(plan, station, checkedAt);
  const finish = plan.stations[plan.stations.length - 1];
  const barrier = barrierRow(plan, index, offset, () => true);
  const rows: RaceDayRow[] = [
    ...(barrier
      ? [
          {
            label: barrier.label,
            value: barrier.value.replace(/^Marge de /, "marge "),
            aside: null,
          },
        ]
      : []),
    ...(station.kind === "finish"
      ? []
      : [
          {
            label: "Arrivée recalculée",
            value: clockAt(plan, finish.arrivalSeconds + offset),
            aside: null,
          },
        ]),
    ...(station.stopSeconds > 0
      ? [
          {
            label: "Arrêt prévu ici",
            value: formatDuration(station.stopSeconds),
            aside: null,
          },
        ]
      : []),
  ];
  return {
    title: `${station.kind === "finish" ? "Arrivée" : station.name} · km ${km(station.distanceM)}`,
    checked: clockOf(plan, checkedAt),
    planned: `prévu ${clockAt(plan, station.arrivalSeconds)} · ${gapSentence(offset)}`,
    rows,
    todo: station.todo,
  };
}

export function raceDayWindow(
  raceDate: string | null,
  today: string,
): "before" | "open" | "after" {
  if (!raceDate) return "before";
  const day = Date.UTC(
    Number(raceDate.slice(0, 4)),
    Number(raceDate.slice(5, 7)) - 1,
    Number(raceDate.slice(8, 10)),
  );
  const now = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  );
  const days = Math.round((day - now) / 86_400_000);
  if (days > 1) return "before";
  if (days < -1) return "after";
  return "open";
}
