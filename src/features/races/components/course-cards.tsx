import { cn } from "@/lib/utils";
import { MonoLabel } from "@/components/stride/mono-label";
import {
  formatClock,
  formatDecimal,
  formatDuration,
  formatKm,
} from "../format";
import type { ProfileData } from "../profile";
import { formatShortDate, type RaceSummary } from "../race";
import type { RaceWeather } from "../weather";
import type { RacePlanModel } from "../workspace";
import { ProfileChart } from "./profile-chart";
import { CardLabel, LegendItem, RaceCard } from "./race-ui";

export function ProfileCard({
  profile,
  planned,
  weather,
  walkThreshold,
  walkCount,
  walkDistanceM,
  race,
}: {
  profile: ProfileData;
  planned: RacePlanModel | null;
  weather: RaceWeather | null;
  walkThreshold: number;
  walkCount: number;
  walkDistanceM: number;
  race: RaceSummary;
}) {
  const road = race.kind === "road";
  const label = road
    ? `Profil altimétrique du parcours : ${formatKm(profile.distanceM)} km`
    : `Profil altimétrique : ${formatKm(profile.distanceM)} km, ${walkCount} portions de marche au-dessus de ${walkThreshold} %`;
  const weatherNote = weather
    ? weather.mode === "forecast"
      ? "Prévisions Open-Meteo · mises à jour chaque matin"
      : `Météo : normales de saison du ${race.date ? formatShortDate(race.date) : "jour J"} · prévisions dès le ${formatShortDate(weather.forecastFrom)}`
    : null;
  return (
    <RaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardLabel>
          <span className="max-sm:hidden">
            {road ? "Profil du parcours" : "Profil, passages et météo"}
            {planned
              ? ` · simulation ${formatDuration(planned.scenario.seconds)}`
              : ""}
          </span>
          <span className="sm:hidden">
            {road ? "Profil du parcours" : "Profil, passages et météo"}
          </span>
        </CardLabel>
        {!road && weatherNote && (
          <MonoLabel
            size="micro"
            className="text-muted-foreground max-sm:hidden"
          >
            {weatherNote}
          </MonoLabel>
        )}
        {!road && weather && (
          <MonoLabel size="micro" className="text-muted-foreground sm:hidden">
            {weather.mode === "forecast" ? "Prévisions" : "Normales"}
          </MonoLabel>
        )}
      </div>
      <ProfileChart
        data={profile}
        variant="full"
        label={label}
        className="max-sm:hidden"
      />
      <ProfileChart
        data={profile}
        variant="mobile"
        label={label}
        className="sm:hidden"
      />
      {!road && (
        <div className="flex flex-wrap gap-x-5.5 gap-y-2">
          {!road && (
            <LegendItem
              mark={<span className="h-0.75 w-4.5 rounded-mark bg-primary" />}
            >
              <span className="max-sm:hidden">
                Marche rapide ≥ {walkThreshold} % · {walkCount} portions ·{" "}
                {formatDecimal(walkDistanceM / 1000)} km
              </span>
              <span className="sm:hidden">Marche ≥ {walkThreshold} %</span>
            </LegendItem>
          )}
          {!road && profile.night.length > 0 && (
            <LegendItem
              mark={<span className="h-2.5 w-3.5 rounded-mark bg-data-2/35" />}
            >
              <span className="max-sm:hidden">De nuit</span>
              <span className="sm:hidden">Nuit</span>
            </LegendItem>
          )}
          {!road && profile.rain.length > 0 && (
            <LegendItem
              mark={
                <span className="h-2.5 w-3.5 rounded-mark bg-[repeating-linear-gradient(45deg,var(--data-2)_0_1px,transparent_1px_4px)]" />
              }
            >
              Averses prévues
            </LegendItem>
          )}
          {!road && planned && (
            <span className="max-sm:hidden">
              <LegendItem
                mark={
                  <span className="text-body font-semibold text-primary tabular-nums">
                    {formatClock(planned.simulation.passages[0].clockMinutes)}
                  </span>
                }
              >
                Passage prévu
              </LegendItem>
            </span>
          )}
          {!road && profile.markers.some((marker) => marker.cutoff) && (
            <span className="max-sm:hidden">
              <LegendItem
                mark={
                  <MonoLabel size="nano" tone="warning">
                    BH
                  </MonoLabel>
                }
              >
                Barrière horaire
              </LegendItem>
            </span>
          )}
        </div>
      )}
      {!road && planned && (
        <ul className="flex flex-col sm:hidden">
          {profile.markers
            .filter((marker) => marker.boundary)
            .map((marker) => (
              <li
                key={marker.id}
                className="flex items-center gap-3 border-t border-border py-2.5"
              >
                <MarkBadge marker={marker} />
                <span className="flex-1 text-body">
                  {marker.name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatKm(marker.distanceM)}
                  </span>
                </span>
                <span className="text-title font-semibold text-primary tabular-nums">
                  {marker.clock}
                </span>
                <MonoLabel
                  size="nano"
                  tone="warning"
                  className="w-16 text-right"
                >
                  {marker.cutoff ? `BH ${marker.cutoff}` : ""}
                </MonoLabel>
              </li>
            ))}
        </ul>
      )}
    </RaceCard>
  );
}

export function MarkBadge({
  marker,
  active = false,
}: {
  marker: Pick<ProfileData["markers"][number], "mark">;
  active?: boolean;
}) {
  const { mark } = marker;
  if (mark.shape === "diamond" || mark.shape === "triangle")
    return (
      <span
        aria-hidden="true"
        className="grid size-5.5 shrink-0 place-items-center"
      >
        <span
          className={cn(
            "size-3.5 rotate-45 border-[1.6px]",
            mark.shape === "triangle"
              ? "border-secondary-foreground"
              : mark.tone === "caution"
                ? "border-warning"
                : "border-data-2",
          )}
        />
      </span>
    );
  const filled = active || (mark.shape === "circle" && mark.tone !== "station");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5.5 shrink-0 place-items-center text-label leading-none font-bold tabular-nums",
        mark.shape === "square" ? "rounded-sm" : "rounded-full",
        active || (mark.shape === "circle" && mark.tone === "finish")
          ? "bg-primary text-primary-foreground"
          : mark.shape === "circle" && mark.tone === "start"
            ? "bg-foreground text-background"
            : mark.shape === "square"
              ? "border-[1.6px] border-data-2 text-foreground"
              : "border-[1.6px] border-foreground text-foreground",
        filled && "border-0",
      )}
    >
      {mark.label}
    </span>
  );
}
