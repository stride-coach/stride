"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOnboardingContext } from "@/server/onboarding/context";
import { recordHealthConsent, revokeHealthConsent } from "./health-consent";

const consentSchema = z.strictObject({ accepted: z.literal(true) });

export type HealthConsentActionResult =
  | { status: "granted" }
  | { status: "withdrawn" }
  | { status: "failed" }
  | { status: "session-expired" };

export async function giveHealthConsent(
  input: unknown,
): Promise<HealthConsentActionResult> {
  if (!consentSchema.safeParse(input).success) return { status: "failed" };
  const context = await getOnboardingContext({ writable: true }).catch(
    () => null,
  );
  if (!context) return { status: "session-expired" };
  if (!(await recordHealthConsent(context))) return { status: "failed" };
  revalidatePath("/", "layout");
  return { status: "granted" };
}

export async function withdrawHealthConsent(): Promise<HealthConsentActionResult> {
  const context = await getOnboardingContext({ writable: true }).catch(
    () => null,
  );
  if (!context) return { status: "session-expired" };
  if (!(await revokeHealthConsent(context))) return { status: "failed" };
  revalidatePath("/", "layout");
  return { status: "withdrawn" };
}
