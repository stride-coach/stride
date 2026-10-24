import "server-only";
import { cache } from "react";
import { z } from "zod";
import {
  hasHealthConsent,
  healthConsentPurpose,
  healthConsentRecordSchema,
  healthConsentStatus,
} from "@/features/consent/health-consent";
import { privacyPolicyVersion } from "@/features/public/publisher";
import type { OnboardingContext } from "@/server/onboarding/context";

const recordsSchema = z.array(healthConsentRecordSchema);

export const readHealthConsent = cache(async (context: OnboardingContext) => {
  const { data, error } = await context.client
    .from("athlete_consents")
    .select("policy_version,granted_at,withdrawn_at")
    .eq("user_id", context.userId)
    .eq("purpose", healthConsentPurpose)
    .order("granted_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("Health consent is unavailable");
  return healthConsentStatus(recordsSchema.parse(data));
});

export async function holdsHealthConsent(context: OnboardingContext) {
  return hasHealthConsent(await readHealthConsent(context));
}

export async function recordHealthConsent(context: OnboardingContext) {
  const { error } = await context.client.from("athlete_consents").insert({
    user_id: context.userId,
    purpose: healthConsentPurpose,
    policy_version: privacyPolicyVersion,
  });
  return !error || error.code === "23505";
}

export async function revokeHealthConsent(context: OnboardingContext) {
  const { error } = await context.client
    .from("athlete_consents")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("user_id", context.userId)
    .eq("purpose", healthConsentPurpose)
    .is("withdrawn_at", null);
  return !error;
}
