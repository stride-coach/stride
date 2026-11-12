import "server-only";
import {
  settingChangeColumns,
  settingChanges,
} from "@/features/races/settings-history";
import type { OnboardingContext } from "@/server/onboarding/context";

const historyLimit = 10;

export async function readSettingChanges(
  context: OnboardingContext,
  raceId: string,
) {
  const { data, error } = await context.client
    .from("race_setting_changes")
    .select(settingChangeColumns)
    .eq("user_id", context.userId)
    .eq("race_id", raceId)
    .order("created_at", { ascending: false })
    .limit(historyLimit);
  return error ? [] : settingChanges(data ?? []);
}
