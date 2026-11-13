import { formatClock, formatDuration, formatInteger, formatKm } from "./format";
import type { TimelineStation } from "./timeline";

type Range = { fromM: number; toM: number };

type Station = Pick<
  TimelineStation,
  "name" | "kind" | "distanceM" | "clockMinutes" | "marginSeconds"
>;

const tightSeconds = 30 * 60;

function km(meters: number) {
  return meters < 10_000 ? formatKm(meters) : formatInteger(meters / 1000);
}

function stationBefore(stations: Station[], distanceM: number) {
  return stations
    .filter(
      (station) => station.distanceM <= distanceM && station.kind !== "finish",
    )
    .at(-1);
}

function from(station: Station | undefined) {
  return !station || station.kind === "start"
    ? "dès le départ"
    : `dès ${station.name}`;
}

function timing(stations: Station[]) {
  const finish = stations.at(-1);
  if (!finish) return null;
  const arrival = `Tu arrives vers ${formatClock(finish.clockMinutes)}`;
  const tightest = stations
    .filter((station) => station.marginSeconds !== null)
    .sort((left, right) => left.marginSeconds! - right.marginSeconds!)[0];
  if (!tightest) return `${arrival}.`;
  const margin = formatDuration(Math.max(0, tightest.marginSeconds!));
  if (tightest.marginSeconds! < tightSeconds)
    return tightest.kind === "finish"
      ? `${arrival}, seulement ${margin} avant la barrière.`
      : `${arrival}, mais ta marge à ${tightest.name} n’est que de ${margin}.`;
  return tightest.kind === "finish"
    ? `${arrival}, ${margin} avant la barrière.`
    : `${arrival}, avec ${margin} d’avance à ${tightest.name}, ta barrière la plus serrée.`;
}

export function planReading({
  stations,
  rain,
  night,
}: {
  stations: Station[];
  rain: Range[];
  night: Range[];
}) {
  const sentences = [timing(stations)];
  const shower = rain[0];
  const dark = night.find((range) => range.fromM > 0);
  if (shower)
    sentences.push(
      `Les averses arrivent au km ${km(shower.fromM)} : veste ${from(stationBefore(stations, shower.fromM))}.`,
    );
  else if (dark)
    sentences.push(
      `La nuit tombe au km ${km(dark.fromM)} : frontale ${from(stationBefore(stations, dark.fromM))}.`,
    );
  return sentences
    .filter((sentence): sentence is string => !!sentence)
    .join(" ");
}
