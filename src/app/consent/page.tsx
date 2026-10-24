import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HealthConsentGate } from "@/features/consent/components/health-consent-gate";
import { formatConsentDate } from "@/features/consent/health-consent";
import { readHealthConsent } from "@/server/consent/health-consent";
import { getOnboardingContext } from "@/server/onboarding/context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ton accord pour tes données de santé",
};

export default async function ConsentPage() {
  const context = await getOnboardingContext();
  if (!context) redirect("/sign-in");
  const status = await readHealthConsent(context);
  if (status.kind === "active") redirect("/");
  return (
    <HealthConsentGate
      email={context.email}
      withdrawnOn={
        status.kind === "withdrawn"
          ? formatConsentDate(status.withdrawnAt)
          : null
      }
    />
  );
}
