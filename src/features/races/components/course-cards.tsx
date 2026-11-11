import { cn } from "@/lib/utils";
import { Widget } from "@/components/stride/widget";
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
import { LegendItem } from "./race-ui";

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
    <Widget
      headingLevel={2}
      aria-labelledby="race-profile"
      title={
        <span id="race-profile">
          {road ? "Profil du parcours" : "Profil, passages et météo"}
          {planned && (
            <span className="font-normal text-muted-foreground max-sm:hidden">
              {` · simulation ${formatDuration(planned.scenario.seconds)}`}
            </span>
          )}
        </span>
      }
      verdict={
        !road &&
        weather && (
          <span className="text-label font-normal text-muted-foreground">
            <span className="max-sm:hidden">{weatherNote}</span>
            <span className="sm:hidden">
              {weather.mode === "forecast" ? "Prévisions" : "Normales"}
            </span>
          </span>
        )
      }
    >
      <div className="flex flex-col gap-3.5">
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
                mark={
                  <span className="h-2.5 w-3.5 rounded-mark bg-data-2/35" />
                }
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
                    <span className="text-label font-medium text-warning">
                      BH
                    </span>
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
                  <span
                    data-slot="metric"
                    className="font-semibold text-primary tabular-nums"
                  >
                    {marker.clock}
                  </span>
                  <span className="w-16 text-right text-label font-medium text-warning">
                    {marker.cutoff ? `BH ${marker.cutoff}` : ""}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Widget>
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
            "size-3.5 rotate-45 border-2",
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
        "grid size-5.5 shrink-0 place-items-center text-label leading-none font-semibold tabular-nums",
        mark.shape === "square" ? "rounded-sm" : "rounded-full",
        active || (mark.shape === "circle" && mark.tone === "finish")
          ? "bg-primary text-primary-foreground"
          : mark.shape === "circle" && mark.tone === "start"
            ? "bg-foreground text-background"
            : mark.shape === "square"
              ? "border-2 border-data-2 text-foreground"
              : "border-2 border-foreground text-foreground",
        filled && "border-0",
      )}
    >
      {mark.label}
    </span>
  );
}
