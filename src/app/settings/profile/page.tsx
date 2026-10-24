import type { Metadata } from "next";
import { loadHeartRateZones } from "@/server/activities/activities";
import { requireAthlete } from "@/server/app/session";
import { readSettingsProfile } from "@/server/settings/profile";
import { readRunningMaximum } from "@/server/heart-rate/maximum";
import { readProfileMetrics } from "@/server/settings/data";
import { loadTrainingTargets } from "@/server/plans/paces";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { ProfileZones } from "@/features/settings/components/profile-zones";
import { paceZones } from "@/features/settings/zones";

export const metadata: Metadata = { title: "Profil · Réglages" };

export default async function ProfileSettingsPage() {
  const context = await requireAthlete();
  const [snapshot, metrics, maximum, zones, targets] = await Promise.all([
    readSettingsProfile(context),
    readProfileMetrics(context),
    readRunningMaximum(context),
    loadHeartRateZones(context, new Date()),
    loadTrainingTargets(context),
  ]);
  const threshold =
    metrics.find((metric) => metric.key === "threshold")?.providerValue ?? null;
  return (
    <ProfileForm
      snapshot={snapshot}
      zones={zones}
      metrics={metrics}
      observedMaximum={maximum.observed?.value ?? null}
      providerThreshold={
        threshold !== null &&
        Number.isInteger(threshold) &&
        threshold >= 100 &&
        threshold <= 230
          ? threshold
          : null
      }
    >
      <ProfileZones
        heartRate={zones}
        paces={targets ? paceZones(targets) : null}
      />
    </ProfileForm>
  );
}
