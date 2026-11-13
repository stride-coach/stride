import "server-only";
import { z } from "zod";
import type { RaceWeather } from "@/features/races/weather";
import type { WeatherSnapshot } from "@/features/races/weather-watch";
import type { OnboardingContext } from "@/server/onboarding/context";

const slotSchema = z.object({
  elapsedSeconds: z.number(),
  epochMs: z.number(),
  clockMinutes: z.number(),
  distanceM: z.number(),
  lat: z.number(),
  lon: z.number(),
  night: z.boolean(),
  temperature: z.number(),
  precipitationProbability: z.number(),
  code: z.number(),
  apparentTemperature: z.number().nullable(),
  windKmh: z.number().nullable(),
  windDirection: z.number().nullable(),
  gustsKmh: z.number().nullable(),
});

const weatherSchema = z.object({
  mode: z.enum(["forecast", "normals"]),
  slots: z.array(slotSchema),
  title: z.string(),
  detail: z.string(),
  facts: z.array(z.string()),
  source: z.string(),
  rainyDayShare: z.number().nullable(),
  forecastFrom: z.string(),
});

const rowSchema = z.object({
  observed_on: z.string(),
  weather: weatherSchema,
  adopted: z.boolean(),
});

export async function readWeatherSnapshots(
  context: OnboardingContext,
  raceId: string,
  since: string,
): Promise<WeatherSnapshot[]> {
  const { data, error } = await context.client
    .from("race_weather_snapshots")
    .select("observed_on, weather, adopted")
    .eq("user_id", context.userId)
    .eq("race_id", raceId)
    .gte("observed_on", since)
    .order("observed_on", { ascending: true });
  if (error) return [];
  return (data ?? []).flatMap((row) => {
    const parsed = rowSchema.safeParse(row);
    return parsed.success
      ? [
          {
            observedOn: parsed.data.observed_on,
            weather: parsed.data.weather,
            adopted: parsed.data.adopted,
          },
        ]
      : [];
  });
}

export async function recordWeatherSnapshot(
  context: OnboardingContext,
  raceId: string,
  observedOn: string,
  weather: RaceWeather,
) {
  await context.client.from("race_weather_snapshots").upsert(
    {
      race_id: raceId,
      user_id: context.userId,
      observed_on: observedOn,
      weather,
    },
    { onConflict: "race_id,observed_on", ignoreDuplicates: true },
  );
}
