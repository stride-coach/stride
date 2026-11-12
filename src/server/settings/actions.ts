"use server";

import { persistSettingsProfile } from "@/server/settings/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  profileSaveSchema,
  type ProfilePatch,
} from "@/features/onboarding/profile";
import { changedProfileSources } from "@/features/settings/profile";
import {
  goalFocuses,
} from "@/features/onboarding/goals";
import { getOnboardingContext } from "@/server/onboarding/context";
import { saveGoal } from "@/server/onboarding/goals";
import { readProfile, saveProfile } from "@/server/onboarding/profile";
import { isTimeZone } from "@/features/plans/constraints";
import {
  maxUnavailablePeriods,
  parseUnavailabilityInput,
  parseWeeklyCeiling,
} from "@/features/settings/planning";
import { readPlanningConstraints } from "@/server/plans/constraints";

const revisionSchema = z.coerce.number().int().positive();
const nullableText = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const nullableNumber = (value: FormDataEntryValue | null) => {
  const text = nullableText(value);
  return text === null ? null : Number(text);
};

const trainingPath = "/settings/training";

async function context() {
  return getOnboardingContext({ writable: true });
}

function resultPath(path: string, status: string) {
  return `${path}?status=${encodeURIComponent(status)}`;
}

export async function saveSettingsProfile(data: FormData) {
  const values: ProfilePatch = {
    first_name: nullableText(data.get("first_name")),
    birth_date: nullableText(data.get("birth_date")),
    sex: nullableText(data.get("sex")) as ProfilePatch["sex"],
    height_cm: nullableNumber(data.get("height_cm")),
    weight_kg: nullableNumber(data.get("weight_kg")),
  };
  if (Object.values(values).some((value) => value === null))
    redirect(resultPath("/settings/profile", "invalid"));
  await commitProfile(data, values, "/settings/profile");
}

export async function saveSettingsTraining(data: FormData) {
  const values: ProfilePatch = {
    primary_terrain: nullableText(
      data.get("primary_terrain"),
    ) as ProfilePatch["primary_terrain"],
    available_weekdays: data.getAll("available_weekdays").map(Number),
    long_run_day: nullableText(
      data.get("long_run_day"),
    ) as ProfilePatch["long_run_day"],
    weekday_session_minutes: nullableNumber(
      data.get("weekday_session_minutes"),
    ) as ProfilePatch["weekday_session_minutes"],
    training_access: data
      .getAll("training_access")
      .map(String) as ProfilePatch["training_access"],
  };
  if (
    !values.primary_terrain ||
    !values.long_run_day ||
    !values.weekday_session_minutes ||
    !values.available_weekdays?.length ||
    values.available_weekdays.length > 5
  )
    redirect(resultPath(trainingPath, "invalid"));
  await commitProfile(data, values, "/settings/training");
}

async function commitProfile(
  data: FormData,
  values: ProfilePatch,
  path: string,
) {
  const revision = revisionSchema.safeParse(data.get("revision"));
  const currentContext = await context();
  if (!currentContext) redirect(resultPath(path, "session-expired"));
  const current = await readProfile(currentContext).catch(() => null);
  if (!current) redirect(resultPath(path, "error"));
  if (current.revision !== (revision.success ? revision.data : null))
    redirect(resultPath(path, "conflict"));
  const parsed = profileSaveSchema.safeParse({
    values,
    revision: revision.success ? revision.data : null,
    sources: changedProfileSources(values, current.values),
  });
  if (!parsed.success) redirect(resultPath(path, "invalid"));
  const result = await saveProfile({ context }, parsed.data);
  if (result.status === "saved") revalidatePath(path);
  redirect(resultPath(path, result.status));
}

export async function saveSettingsGoal(data: FormData) {
  const parsed = z
    .object({ focus: z.enum(goalFocuses), revision: revisionSchema })
    .safeParse({ focus: data.get("focus"), revision: data.get("revision") });
  if (!parsed.success) redirect(resultPath(trainingPath, "invalid"));
  const result = await saveGoal(
    { context },
    { values: { focus: parsed.data.focus }, revision: parsed.data.revision },
  );
  if (result.status === "saved") revalidatePath(trainingPath);
  redirect(resultPath(trainingPath, result.status));
}

export async function updateSettingsProfile(data: FormData) {
  const current = await context();
  if (!current)
    return {
      status: "session-expired" as const,
      message: "Ta session a expiré. Reconnecte-toi.",
    };
  try {
    const input: unknown = JSON.parse(String(data.get("profile")));
    const file = data.get("photo");
    const result = await persistSettingsProfile(
      current,
      input,
      file instanceof File && file.size > 0 ? file : null,
    );
    if (result.status === "saved") {
      revalidatePath("/settings/profile");
      revalidatePath("/activities");
      revalidatePath("/onboarding");
    }
    return result;
  } catch {
    return {
      status: "error" as const,
      message: "Impossible d’enregistrer ton profil. Réessaie.",
    };
  }
}


export async function saveSettingsPlanning(data: FormData) {
  const timeZone = nullableText(data.get("time_zone"));
  const ceiling = parseWeeklyCeiling(String(data.get("max_weekly") ?? ""));
  const revision = revisionSchema.safeParse(data.get("revision"));
  if (!timeZone || !isTimeZone(timeZone) || ceiling === undefined)
    redirect(resultPath(trainingPath, "invalid"));
  const current = await context();
  if (!current) redirect(resultPath(trainingPath, "session-expired"));
  const settings = await readPlanningConstraints(current).catch(() => null);
  if (!settings) redirect(resultPath(trainingPath, "error"));
  const expected = revision.success ? revision.data : null;
  if (settings.profileRevision !== expected)
    redirect(resultPath(trainingPath, "conflict"));
  const values = { time_zone: timeZone, max_weekly_minutes: ceiling };
  const response =
    expected === null
      ? await current.client
          .from("athlete_profiles")
          .insert({ user_id: current.userId, ...values })
          .select("revision")
      : await current.client
          .from("athlete_profiles")
          .update(values)
          .eq("user_id", current.userId)
          .eq("revision", expected)
          .select("revision");
  if (response.error)
    redirect(
      resultPath(
        trainingPath,
        response.error.code === "23514" ? "invalid" : "error",
      ),
    );
  if (!response.data?.length) redirect(resultPath(trainingPath, "conflict"));
  revalidatePath(trainingPath);
  redirect(resultPath(trainingPath, "saved"));
}

export async function addSettingsUnavailability(data: FormData) {
  const parsed = parseUnavailabilityInput({
    start: String(data.get("starts_on") ?? ""),
    end: String(data.get("ends_on") ?? ""),
    kind: String(data.get("kind") ?? ""),
    reason: String(data.get("reason") ?? ""),
  });
  if (!parsed.ok)
    redirect(resultPath(trainingPath, `unavailability-${parsed.error}`));
  const current = await context();
  if (!current) redirect(resultPath(trainingPath, "session-expired"));
  const { count, error: countError } = await current.client
    .from("athlete_unavailability")
    .select("id", { count: "exact", head: true })
    .eq("user_id", current.userId);
  if (countError) redirect(resultPath(trainingPath, "error"));
  if ((count ?? 0) >= maxUnavailablePeriods)
    redirect(resultPath(trainingPath, "unavailability-limit"));
  const { error } = await current.client
    .from("athlete_unavailability")
    .insert({ user_id: current.userId, ...parsed.value });
  if (error)
    redirect(
      resultPath(trainingPath, error.code === "23514" ? "invalid" : "error"),
    );
  revalidatePath(trainingPath);
  redirect(resultPath(trainingPath, "period-added"));
}

export async function removeSettingsUnavailability(data: FormData) {
  const id = z.uuid().safeParse(data.get("id"));
  if (!id.success) redirect(resultPath(trainingPath, "invalid"));
  const current = await context();
  if (!current) redirect(resultPath(trainingPath, "session-expired"));
  const { error } = await current.client
    .from("athlete_unavailability")
    .delete()
    .eq("id", id.data)
    .eq("user_id", current.userId);
  if (error) redirect(resultPath(trainingPath, "error"));
  revalidatePath(trainingPath);
  redirect(resultPath(trainingPath, "period-removed"));
}
