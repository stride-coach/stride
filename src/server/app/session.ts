import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { onboardingPath, resumeStep } from "@/features/onboarding/progress";
import { holdsHealthConsent } from "@/server/consent/health-consent";
import { getOnboardingContext } from "@/server/onboarding/context";
import { onboardingEnabled } from "@/server/onboarding/environment";
import { ensureProgress } from "@/server/onboarding/progress";

export const requireAthleteAccount = cache(async () => {
  const context = await getOnboardingContext();
  if (!context) redirect("/sign-in");
  if (onboardingEnabled()) {
    const progress = await ensureProgress(context).catch(() => null);
    if (!progress) redirect("/onboarding");
    if (!progress.completed_at) redirect(onboardingPath(resumeStep(progress)));
  }
  return context;
});

export const requireAthlete = cache(async () => {
  const context = await requireAthleteAccount();
  if (!(await holdsHealthConsent(context))) redirect("/consent");
  return context;
});
