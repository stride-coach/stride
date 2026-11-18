import "server-only";
import { z } from "zod";
import type { DecisionSignals } from "@/features/coach/decisions";
import type { WellnessDay } from "@/features/coach/decision-outcomes";
import { localToday } from "@/features/plans/constraints";
import type { ProposalRecord } from "@/features/plans/review/proposal";
import { addDays } from "@/features/progress/period";
import { baselineDays } from "@/features/progress/recovery";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readAll } from "@/server/progress/history";
import { readSessionMatches } from "./matches";

type PlanContext = Pick<OnboardingContext, "client" | "userId">;

const maximumLookbackDays = 365;

const observationSchema = z.object({
  metric: z.enum(["hrv_last_night_ms", "resting_heart_rate_bpm"]),
  observed_on: z.string(),
  value_numeric: z.coerce.number().nullable(),
});

async function readWellness(
  context: PlanContext,
  since: string,
): Promise<WellnessDay[]> {
  const rows = await readAll((from, to) =>
    context.client
      .from("provider_observations")
      .select("metric, observed_on, value_numeric")
      .eq("user_id", context.userId)
      .in("metric", ["hrv_last_night_ms", "resting_heart_rate_bpm"])
      .in("availability", ["available", "partial"])
      .gte("observed_on", since)
      .order("observed_on", { ascending: true })
      .order("metric", { ascending: true })
      .range(from, to),
  );
  const days = new Map<string, WellnessDay>();
  for (const row of rows) {
    const parsed = observationSchema.safeParse(row);
    if (!parsed.success || parsed.data.value_numeric === null) continue;
    const day = days.get(parsed.data.observed_on) ?? {
      day: parsed.data.observed_on,
      hrv: null,
      restingHeartRate: null,
    };
    if (parsed.data.metric === "hrv_last_night_ms")
      day.hrv = parsed.data.value_numeric;
    else day.restingHeartRate = parsed.data.value_numeric;
    days.set(day.day, day);
  }
  return [...days.values()];
}

export async function readDecisionSignals(
  context: PlanContext,
  input: {
    proposals: ProposalRecord[];
    planId: string | null;
    timeZone: string;
    now: Date;
  },
): Promise<DecisionSignals> {
  const recovery = input.proposals.filter(
    (proposal) =>
      proposal.origin === "recovery" &&
      proposal.status !== "draft" &&
      proposal.status !== "ready",
  );
  const today = localToday(input.timeZone, input.now);
  const oldest = recovery
    .map((proposal) => localToday(input.timeZone, new Date(proposal.createdAt)))
    .sort()[0];
  const floor = addDays(today, -maximumLookbackDays);
  const since = oldest ? addDays(oldest, -baselineDays) : null;
  const [wellness, matches] = await Promise.all([
    since ? readWellness(context, since > floor ? since : floor) : [],
    input.planId ? readSessionMatches(context, input.planId) : [],
  ]);
  return {
    wellness,
    matches: matches.map((match) => ({
      sessionKey: match.sessionKey,
      status: match.status,
      compliance: match.compliance,
    })),
  };
}
