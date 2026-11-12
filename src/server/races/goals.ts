"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  maxRaces,
  parseDuration,
  raceSaveSchema,
} from "@/features/onboarding/goals";
import { getOnboardingContext } from "@/server/onboarding/context";
import { deleteRaces, saveRace } from "@/server/onboarding/goals";

export type RaceSubmitResult =
  | { status: "saved"; id: string }
  | {
      status: "invalid" | "conflict" | "missing" | "error" | "session-expired";
    };

export type RaceRemoveResult = {
  status: "deleted" | "invalid" | "missing" | "error" | "session-expired";
};

const clockPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const nullableText = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const nullableNumber = (value: FormDataEntryValue | null) => {
  const text = nullableText(value);
  return text === null ? null : Number(text);
};

async function context() {
  return getOnboardingContext({ writable: true });
}

function revalidateRaces() {
  revalidatePath("/races", "layout");
}

function planValues(data: FormData) {
  const start = nullableText(data.get("start_time"));
  const cutoff = parseDuration(nullableText(data.get("cutoff_duration")) ?? "");
  return {
    start: start !== null && clockPattern.test(start) ? `${start}:00` : null,
    cutoff: cutoff ?? null,
  };
}

async function savePlanValues(
  current: NonNullable<Awaited<ReturnType<typeof context>>>,
  raceId: string,
  plan: ReturnType<typeof planValues>,
) {
  const values = {
    start_time: plan.start,
    start_time_confirmed: plan.start !== null,
    cutoff_duration_seconds: plan.cutoff,
  };
  const { data, error } = await current.client
    .from("race_plans")
    .update(values)
    .eq("race_id", raceId)
    .eq("user_id", current.userId)
    .select("race_id");
  if (error) return false;
  if (data && data.length > 0) return true;
  if (plan.start === null && plan.cutoff === null) return true;
  const { error: insertError } = await current.client
    .from("race_plans")
    .insert({ race_id: raceId, user_id: current.userId, ...values });
  return !insertError;
}

function testItemsOf(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  try {
    const items: unknown = JSON.parse(value);
    return Array.isArray(items) && items.length > 0 ? items : null;
  } catch {
    return undefined;
  }
}

function raceFormValues(data: FormData) {
  return {
    location: nullableText(data.get("location")),
    poles: nullableText(data.get("poles")),
    expectation: nullableText(data.get("expectation")),
    test_items: testItemsOf(data.get("test_items")),
    race_kind: data.get("race_kind"),
    name: nullableText(data.get("name")),
    race_date: nullableText(data.get("race_date")),
    distance_km: nullableNumber(data.get("distance_km")),
    elevation_gain_m: nullableNumber(data.get("elevation_gain_m")),
    priority: data.get("priority"),
    target_duration_seconds: parseDuration(
      nullableText(data.get("target_duration")) ?? "",
    ),
  };
}

export async function submitRace(data: FormData): Promise<RaceSubmitResult> {
  const values = raceFormValues(data);
  const id = nullableText(data.get("id"));
  const check = raceSaveSchema.safeParse({
    id: id ?? "00000000-0000-4000-8000-000000000000",
    revision: id ? Number(data.get("revision")) : 1,
    values,
  });
  if (
    !check.success ||
    !values.name ||
    !values.race_date ||
    !values.distance_km
  )
    return { status: "invalid" };
  const current = await context();
  if (!current) return { status: "session-expired" };
  const plan = planValues(data);
  if (id) {
    const result = await saveRace({ context }, check.data);
    if (result.status !== "saved") return { status: result.status };
    if (!(await savePlanValues(current, id, plan))) return { status: "error" };
    revalidateRaces();
    return { status: "saved", id };
  }
  const { count, error: countError } = await current.client
    .from("athlete_races")
    .select("id", { count: "exact", head: true })
    .eq("user_id", current.userId);
  if (countError) return { status: "error" };
  if ((count ?? 0) >= maxRaces) return { status: "invalid" };
  const { data: created, error } = await current.client
    .from("athlete_races")
    .insert({ user_id: current.userId, ...check.data.values })
    .select("id")
    .single();
  if (error) return { status: "error" };
  if (
    (plan.start !== null || plan.cutoff !== null) &&
    !(await savePlanValues(current, created.id, plan))
  )
    return { status: "error" };
  revalidateRaces();
  return { status: "saved", id: created.id };
}

export async function removeRace(raceId: string): Promise<RaceRemoveResult> {
  const id = z.uuid().safeParse(raceId);
  if (!id.success) return { status: "invalid" };
  const result = await deleteRaces({ context }, { ids: [id.data] });
  if (result.status === "deleted") revalidateRaces();
  return { status: result.status };
}
