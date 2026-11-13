import { formatClock } from "./format";
import type { RaceWeather } from "./weather";

export type PlanNotice = {
  key: "rain" | "fueling" | "weather";
  title: string;
  text: string;
};

const rainThreshold = 50;

export function rainNotice(weather: RaceWeather | null): PlanNotice | null {
  if (!weather || weather.mode !== "forecast") return null;
  const wet = weather.slots.filter(
    (slot) => slot.precipitationProbability > rainThreshold,
  );
  if (wet.length === 0) return null;
  const first = wet[0];
  const last = wet[wet.length - 1];
  const peak = Math.max(...wet.map((slot) => slot.precipitationProbability));
  const when =
    first === last
      ? `vers ${formatClock(first.clockMinutes)}, au km ${Math.round(first.distanceM / 1000)}`
      : `de ${formatClock(first.clockMinutes)} à ${formatClock(last.clockMinutes)}, du km ${Math.round(first.distanceM / 1000)} au km ${Math.round(last.distanceM / 1000)}`;
  return {
    key: "rain",
    title: "Risque de pluie au-dessus de 50 %",
    text: `Jusqu’à ${Math.round(peak)} % ${when}. Le plan prévoit la veste avant la première averse.`,
  };
}

export function fuelingNotice(
  targetG: number,
  capG: number | null,
): PlanNotice | null {
  if (capG === null || targetG <= capG) return null;
  return {
    key: "fueling",
    title: `Ravitaillement plafonné à ${capG} g/h`,
    text: `Ta cible de ${targetG} g/h dépasse ce que tu as validé à l’entraînement : le plan s’arrête à ${capG} g/h. Teste plus haut en sortie longue pour le relever.`,
  };
}
