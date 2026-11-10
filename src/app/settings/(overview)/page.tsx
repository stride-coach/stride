import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";
import { formatLocalDate, localToday } from "@/features/app-shell/shell";
import {
  athleteModelCounts,
  athleteModelQuestions,
  formatMemberSince,
} from "@/features/settings/athlete-model";
import { cn } from "@/lib/utils";
import { ageOn } from "@/features/settings/age";
import { ModelQuestions } from "@/features/settings/components/model-questions";
import {
  SettingsGroup,
  SettingsLinkRow,
} from "@/features/settings/components/settings-shell";
import { loadAthleteProfile } from "@/server/onboarding/athlete-profile";
import { readProfile } from "@/server/onboarding/profile";
import { readGoals } from "@/server/onboarding/goals";
import { requireAthleteAccount } from "@/server/app/session";
import { getShellIdentity } from "@/server/app/shell";
import { signOut } from "@/server/auth/actions";
import { pushSummary } from "@/features/notifications/push";
import { readPushSettings } from "@/server/push/preferences";
import { readProfileMetrics } from "@/server/settings/data";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsOverviewPage() {
  const context = await requireAthleteAccount();
  const [profile, goals, shell, athleteProfile, push, metrics] =
    await Promise.all([
      readProfile(context),
      readGoals(context),
      getShellIdentity(),
      loadAthleteProfile(context, new Date()),
      readPushSettings(context),
      readProfileMetrics(context),
    ]);
  const races = goals.races
    .filter((item) => item.values.name)
    .toSorted((a, b) =>
      (a.values.race_date ?? "9999").localeCompare(
        b.values.race_date ?? "9999",
      ),
    )
    .map((item) => `${item.values.name} (${item.values.priority})`);
  const age = ageOn(profile.values.birth_date, localToday(new Date()));
  const days = profile.values.available_weekdays?.length;
  const counts = athleteModelCounts(athleteProfile);
  const questions = athleteModelQuestions(
    athleteProfile,
    profile.values,
    metrics,
  );
  const updated = formatLocalDate(profile.updatedAt);
  const memberSince = formatMemberSince(context.createdAt ?? null);
  const segments = [
    {
      key: "garmin",
      count: counts.garmin,
      label: `${counts.garmin} ${counts.garmin > 1 ? "faits relevés" : "fait relevé"} par Garmin`,
      className: "bg-foreground",
    },
    {
      key: "athlete",
      count: counts.athlete,
      label: `${counts.athlete} de ta part`,
      className: "bg-foreground",
    },
    {
      key: "estimate",
      count: counts.estimate,
      label: `${counts.estimate} ${counts.estimate > 1 ? "estimés" : "estimé"} par Stride`,
      className: "bg-primary",
    },
  ];
  return (
    <>
      <div className="mb-5 flex items-center gap-4 md:mb-8">
        <span className="grid size-14 place-items-center rounded-lg bg-muted font-semibold">
          {shell.athlete.initials}
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-verdict">
            {shell.athlete.name}
          </strong>
          <span className="block truncate text-body text-secondary-foreground">
            {context.email}
            {memberSince && (
              <span className="hidden md:inline">
                {" "}
                · membre depuis {memberSince}
              </span>
            )}
          </span>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
          className="hidden md:block"
        >
          <Button type="submit" variant="outline">
            Se déconnecter
          </Button>
        </form>
      </div>
      <div className="mb-6 flex flex-col gap-2 rounded-lg border border-border bg-card p-4 md:mb-10 md:gap-4 md:px-6 md:py-5.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <StrideMark className="hidden md:block" />
            <h2 className="text-body font-semibold md:text-title">
              <span className="md:hidden">Modèle d’athlète</span>
              <span className="hidden md:inline">Ton modèle d’athlète</span>
            </h2>
          </div>
          {updated && (
            <span className="hidden text-body text-secondary-foreground md:block">
              Mis à jour le {updated}
            </span>
          )}
        </div>
        <p className="hidden max-w-160 text-body leading-normal text-secondary-foreground md:block">
          Garmin fournit les signaux. Stride en tire ton modèle, avec tes
          réponses, tes objectifs et ta façon de réagir à l’entraînement.
        </p>
        <div
          role="img"
          aria-label={segments.map(({ label }) => label).join(", ")}
          className="flex h-2 gap-0.5 md:h-2.5"
        >
          {segments.map(({ key, count, className }) => (
            <span
              key={key}
              style={{ flexGrow: count }}
              className={cn(
                "basis-0 first:rounded-l-xs last:rounded-r-xs",
                className,
              )}
            />
          ))}
        </div>
        <p className="text-label text-muted-foreground md:hidden">
          {counts.garmin} {counts.garmin > 1 ? "faits" : "fait"} Garmin ·{" "}
          {counts.athlete} de toi · {counts.estimate}{" "}
          {counts.estimate > 1 ? "estimés" : "estimé"}
        </p>
        <div className="hidden flex-wrap gap-x-5 gap-y-2 md:flex">
          {segments.map(({ key, label, className }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 text-label text-muted-foreground"
            >
              <span className={cn("size-2 rounded-xs", className)} />
              {label}
            </span>
          ))}
        </div>
        <ModelQuestions questions={questions} />
      </div>
      <SettingsGroup title="Toi">
        <SettingsLinkRow
          href="/settings/profile"
          title="Profil"
          detail={
            [
              profile.values.height_cm && `${profile.values.height_cm} cm`,
              profile.values.weight_kg && `${profile.values.weight_kg} kg`,
              age !== null && `${age} ans`,
            ]
              .filter(Boolean)
              .join(" · ") || "Renseigner mon profil"
          }
        />
        <SettingsLinkRow
          href="/settings/training"
          title="Entraînement et coach"
          detail={
            days ? `${days} jours par semaine` : "Renseigner mes disponibilités"
          }
        />
        <SettingsLinkRow
          href="/settings/goals"
          title="Objectifs et courses"
          detail={races.join(" · ") || "Aucune course"}
        />
        <SettingsLinkRow
          href="/settings/training#notifications"
          title="Notifications"
          detail={pushSummary({
            configured: push.publicKey !== null,
            devices: push.endpoints.length,
            preferences: push.preferences,
          })}
        />
      </SettingsGroup>
      <SettingsGroup title="Données">
        <SettingsLinkRow
          href="/settings/connections"
          title="Connexions"
          detail="Garmin"
        />
        <SettingsLinkRow
          href="/settings/privacy"
          title="Données et confidentialité"
          detail="Ce qu’on stocke · copie de tes réglages"
        />
      </SettingsGroup>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
        className="fixed right-4 bottom-4 left-4 md:hidden"
      >
        <Button type="submit" variant="outline" className="w-full">
          Se déconnecter
        </Button>
      </form>
    </>
  );
}
