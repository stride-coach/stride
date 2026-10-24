import { describe, expect, it } from "vitest";
import type { HeartRateZones } from "@/features/onboarding/heart-rate-zones";
import {
  trainingTargets,
  type TargetsInput,
} from "@/features/plans/targets/targets";
import { heartRateZoneSource, paceZones } from "@/features/settings/zones";

const input = (patch: Partial<TargetsInput> = {}): TargetsInput => ({
  today: "2026-10-14",
  flatLapThresholdPace: null,
  garminLactateThreshold: null,
  bestEfforts: [],
  vo2Max: null,
  garminZones: null,
  strideZones: null,
  ...patch,
});

const zones = (patch: Partial<HeartRateZones> = {}): HeartRateZones => ({
  method: "karvonen",
  maximum: 188,
  resting: 47.5,
  restingSamples: 20,
  windowStart: "2026-09-17",
  windowEnd: "2026-10-14",
  zones: [],
  ...patch,
});

describe("paceZones", () => {
  it("lists every pace zone with its source and threshold pace", () => {
    const view = paceZones(
      trainingTargets(
        input({
          flatLapThresholdPace: { secondsPerKm: 280, asOf: "2026-10-12" },
        }),
      ),
    );
    expect(view?.rows.map((row) => row.label)).toEqual([
      "Récupération",
      "Endurance",
      "Allure soutenue",
      "Seuil",
      "Fractionné",
      "Vitesse",
    ]);
    expect(
      view?.rows.every((row) => /^\d:\d{2}–\d:\d{2}$/.test(row.range)),
    ).toBe(true);
    expect(view?.threshold).toMatch(/^4:\d{2}$/);
    expect(view?.source).toBe(
      "Seuil mesuré sur tes tours à plat · 12/10/2026 · confiance élevée",
    );
  });

  it("returns nothing without a pace reference", () => {
    expect(paceZones(trainingTargets(input()))).toBeNull();
  });
});

describe("heartRateZoneSource", () => {
  it("names Karvonen with the rounded resting heart rate", () => {
    expect(heartRateZoneSource(zones())).toBe(
      "Karvonen · FC max 188 · FC repos 48 sur 28 jours",
    );
  });

  it("falls back to a share of maximum heart rate", () => {
    expect(
      heartRateZoneSource(
        zones({ method: "percentage_maximum", resting: null }),
      ),
    ).toBe("% de la FC max · FC max 188");
  });
});
