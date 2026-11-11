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
import { SettingsLinkRow } from "@/features/settings/components/settings-shell";
import { Widget } from "@/components/stride/widget";
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
      className: "bg-secondary-foreground",
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
  const signOutAction = async () => {
    "use server";
    await signOut();
  };
  const profileDetail =
    [
      profile.values.height_cm && `${profile.values.height_cm} cm`,
      profile.values.weight_kg && `${profile.values.weight_kg} kg`,
      age !== null && `${age} ans`,
    ]
      .filter(Boolean)
      .join(" · ") || "Renseigner mon profil";
  return (
    <>
      <h1 className="sr-only">Réglages</h1>
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full border border-control-border bg-muted text-body-lg font-semibold"
        >
          {shell.athlete.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-verdict font-semibold">
            {shell.athlete.name}
          </p>
          <p className="truncate text-secondary-foreground">
            {context.email}
            {memberSince && ` · membre depuis ${memberSince}`}
          </p>
        </div>
        <form action={signOutAction} className="max-sm:w-full">
          <Button type="submit" variant="outline" className="max-sm:w-full">
            Se déconnecter
          </Button>
        </form>
      </div>
      <Widget
        headingLevel={2}
        icon={<StrideMark />}
        title={<span id="settings-model">Ton modèle d’athlète</span>}
        verdict={
          updated && (
            <span className="text-label font-normal text-muted-foreground">
              Mis à jour le {updated}
            </span>
          )
        }
        aria-labelledby="settings-model"
        className="mb-6"
      >
        <div className="flex flex-col gap-3">
          <p className="text-secondary-foreground">
            Garmin fournit les signaux. Stride en tire ton modèle, avec tes
            réponses, tes objectifs et ta façon de réagir à l’entraînement.
          </p>
          <div
            role="img"
            aria-label={segments.map(({ label }) => label).join(", ")}
            className="flex h-1.5 gap-0.5"
          >
            {segments.map(({ key, count, className }) => (
              <span
                key={key}
                style={{ flexGrow: count }}
                className={cn(
                  "basis-0 first:rounded-l-mark last:rounded-r-mark",
                  className,
                )}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {segments.map(({ key, label, className }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 text-label text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 rounded-full", className)}
                />
                {label}
              </span>
            ))}
          </div>
          <ModelQuestions questions={questions} />
        </div>
      </Widget>
      <nav
        aria-label="Sections des réglages"
        className="border-t border-border"
      >
        <SettingsLinkRow
          href="/settings/profile"
          title="Profil et zones"
          detail={profileDetail}
        />
        <SettingsLinkRow
          href="/settings/training"
          title="Entraînement et staff"
          detail={
            days ? `${days} jours par semaine` : "Renseigner mes disponibilités"
          }
        />
        <SettingsLinkRow
          href="/settings/notifications"
          title="Notifications"
          detail={pushSummary({
            configured: push.publicKey !== null,
            devices: push.endpoints.length,
            preferences: push.preferences,
          })}
        />
        <SettingsLinkRow
          href="/settings/appearance"
          title="Apparence et raccourcis"
          detail="Thème · raccourcis clavier"
        />
        <SettingsLinkRow
          href="/settings/goals"
          title="Objectifs et courses"
          detail={races.join(" · ") || "Aucune course"}
        />
        <SettingsLinkRow
          href="/settings/connections"
          title="Connexions"
          detail="Garmin"
        />
        <SettingsLinkRow
          href="/settings/privacy"
          title="Données et confidentialité"
          detail="Ce que Stride conserve · copie de tes réglages"
        />
      </nav>
    </>
  );
}
