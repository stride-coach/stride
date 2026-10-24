import { z } from "zod";
import type { OnboardingStep } from "@/features/onboarding/progress";

export const healthConsentPurpose = "health_data";

export const healthConsentRecordSchema = z.object({
  policy_version: z.string(),
  granted_at: z.string(),
  withdrawn_at: z.string().nullable(),
});
export type HealthConsentRecord = z.infer<typeof healthConsentRecordSchema>;

export type HealthConsentStatus =
  | { kind: "active"; grantedAt: string; policyVersion: string }
  | { kind: "withdrawn"; withdrawnAt: string }
  | { kind: "missing" };

export function healthConsentStatus(
  records: readonly HealthConsentRecord[],
): HealthConsentStatus {
  const active = records.find((record) => record.withdrawn_at === null);
  if (active)
    return {
      kind: "active",
      grantedAt: active.granted_at,
      policyVersion: active.policy_version,
    };
  const withdrawals = records
    .map((record) => record.withdrawn_at)
    .filter((value): value is string => value !== null)
    .sort();
  const latest = withdrawals.at(-1);
  return latest
    ? { kind: "withdrawn", withdrawnAt: latest }
    : { kind: "missing" };
}

export function hasHealthConsent(status: HealthConsentStatus) {
  return status.kind === "active";
}

export function onboardingNeedsHealthConsent(
  step: OnboardingStep,
  garminConnected: boolean,
) {
  if (step === "welcome") return false;
  if (step === "garmin") return garminConnected;
  return true;
}

const consentDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export function formatConsentDate(value: string) {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value,
  );
  return Number.isNaN(date.getTime()) ? value : consentDate.format(date);
}
