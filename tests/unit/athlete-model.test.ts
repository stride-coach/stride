import { describe, expect, it } from "vitest";
import type {
  AthleteProfileView,
  ProfileFact,
} from "@/features/onboarding/athlete-profile";
import {
  emptyProfile,
  type ProfileValues,
} from "@/features/onboarding/profile";
import {
  athleteModelCounts,
  athleteModelQuestions,
  formatMemberSince,
} from "@/features/settings/athlete-model";
import type { ProfileMetric } from "@/features/settings/profile";

const fact = (
  key: string,
  source: ProfileFact["source"],
  value: string | null,
): ProfileFact => ({ key, label: key, value, source, detail: "" });

const view = (
  facts: ProfileFact[],
  extras: Partial<AthleteProfileView> = {},
): AthleteProfileView => ({
  firstName: null,
  activityCount: 0,
  history: null,
  sleepNights: 0,
  heartRateZones: null,
  habits: { final: true, items: [] },
  weeks: [],
  sections: [{ key: "training", title: "", facts }],
  ...extras,
});

const metric = (
  key: ProfileMetric["key"],
  value: number | null,
): ProfileMetric => ({
  key,
  label: key,
  value,
  unit: "bpm",
  date: null,
  source: "provider",
  detail: "",
});

const complete: ProfileValues = {
  ...emptyProfile,
  first_name: "Jules",
  birth_date: "1991-06-14",
  sex: "male",
  height_cm: 178,
  weight_kg: 68,
  primary_terrain: "trail",
  available_weekdays: [2, 3, 4, 6, 7],
  long_run_day: "sunday",
  weekday_session_minutes: 60,
};
const known = [metric("maximum", 188), metric("threshold", 170)];

describe("athleteModelCounts", () => {
  it("counts Garmin, athlete and Stride-derived signals", () => {
    expect(
      athleteModelCounts(
        view(
          [
            fact("vo2_max", "garmin", "52"),
            fact("hrv", "garmin", "60 ms"),
            fact("availability", "athlete", "5 jours"),
            fact("focus", "athlete", null),
          ],
          { heartRateZones: {} as AthleteProfileView["heartRateZones"] },
        ),
      ),
    ).toEqual({ garmin: 2, athlete: 1, estimate: 2 });
  });
});

describe("athleteModelQuestions", () => {
  it("asks nothing when the model is complete", () => {
    expect(
      athleteModelQuestions(
        view([fact("focus", "athlete", "Ultra-trail")]),
        complete,
        known,
      ),
    ).toEqual([]);
  });

  it("asks for missing heart rate references first, with a direct link", () => {
    const questions = athleteModelQuestions(view([]), complete, [
      metric("maximum", null),
      metric("threshold", null),
    ]);
    expect(questions.map((question) => question.key)).toEqual([
      "maximum",
      "threshold",
    ]);
    expect(questions[0]).toMatchObject({
      question: "Quelle est ta FC max ?",
      href: "/settings/profile#entrainement",
    });
  });

  it("asks for the goal focus and each missing required answer", () => {
    const questions = athleteModelQuestions(
      view([fact("focus", "athlete", null)]),
      { ...complete, weight_kg: null, weekday_session_minutes: null },
      known,
    );
    expect(
      questions.map(({ key, href, action }) => ({ key, href, action })),
    ).toEqual([
      { key: "focus", href: "/settings/goals", action: "Choisir" },
      {
        key: "weight_kg",
        href: "/settings/profile#weight_kg",
        action: "Répondre",
      },
      {
        key: "weekday_session_minutes",
        href: "/settings/training#t-time",
        action: "Répondre",
      },
    ]);
  });

  it("does not ask about optional training access", () => {
    expect(
      athleteModelQuestions(
        view([]),
        { ...complete, training_access: null },
        known,
      ),
    ).toEqual([]);
  });
});

describe("formatMemberSince", () => {
  it("formats the month and year in French", () => {
    expect(formatMemberSince("2026-10-05T09:00:00Z")).toBe("oct. 2026");
    expect(formatMemberSince(null)).toBeNull();
  });
});
