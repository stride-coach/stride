import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  PreferenceRow,
  PreferenceSection,
  SegmentedField,
  WeekdayField,
} from "@/features/settings/components/preferences";
import { SettingsNotice } from "@/features/settings/components/settings-notice";
import { requireAthleteAccount } from "@/server/app/session";
import { readGoals } from "@/server/onboarding/goals";
import { readProfile } from "@/server/onboarding/profile";
import {
  addSettingsUnavailability,
  removeSettingsUnavailability,
  saveSettingsGoal,
  saveSettingsPlanning,
  saveSettingsTraining,
} from "@/server/settings/actions";
import {
  PlanningSection,
  UnavailabilitySection,
} from "@/features/settings/components/planning-sections";
import { localToday } from "@/features/plans/constraints";
import { currentPeriods } from "@/features/settings/planning";
import { readPlanningConstraints } from "@/server/plans/constraints";
import { goalFocuses, type GoalFocus } from "@/features/onboarding/goals";

export const metadata: Metadata = { title: "Entraînement et staff · Réglages" };

const weekdays = [
  { value: 1, short: "L", label: "Lundi" },
  { value: 2, short: "M", label: "Mardi" },
  { value: 3, short: "M", label: "Mercredi" },
  { value: 4, short: "J", label: "Jeudi" },
  { value: 5, short: "V", label: "Vendredi" },
  { value: 6, short: "S", label: "Samedi" },
  { value: 7, short: "D", label: "Dimanche" },
];
const access = [
  { value: "hills", label: "Dénivelé" },
  { value: "incline_treadmill", label: "Tapis · jusqu’à 12 %" },
  { value: "gym", label: "Salle" },
  { value: "track", label: "Piste" },
];
const focusLabels: Record<GoalFocus, string> = {
  general_fitness: "Forme générale",
  faster: "Courir plus vite",
  short_distance: "5 km ou 10 km",
  half_marathon_marathon: "Semi-marathon ou marathon",
  trail: "Trail",
  ultra_trail: "Ultra-trail",
};

export default async function TrainingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [context, query] = await Promise.all([
    requireAthleteAccount(),
    searchParams,
  ]);
  const [profile, planning, goals] = await Promise.all([
    readProfile(context),
    readPlanningConstraints(context),
    readGoals(context),
  ]);
  const values = profile.values;
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2 px-1 md:px-0">
        <h1 className="text-verdict font-semibold">Entraînement et staff</h1>
        <p className="max-w-150 text-body-lg text-pretty text-secondary-foreground">
          Ça guide tes plans. Changer tes disponibilités déclenche une
          proposition de mise à jour, sans réécrire ta semaine en douce.
        </p>
      </div>
      <SettingsNotice status={query.status} />
      <form action={saveSettingsTraining} className="flex flex-col gap-6">
        <input type="hidden" name="revision" value={profile.revision ?? ""} />
        <PreferenceSection title="Entraînement">
          <PreferenceRow labelId="t-type" label="Discipline principale">
            <SegmentedField
              name="primary_terrain"
              labelledBy="t-type"
              stretch
              selected={values.primary_terrain ? [values.primary_terrain] : []}
              options={[
                { value: "road", label: "Route" },
                { value: "trail", label: "Trail" },
                { value: "mixed", label: "Les deux" },
              ]}
            />
          </PreferenceRow>
          <PreferenceRow
            labelId="t-days"
            label="Jours où tu peux courir"
            hint="5 jours par semaine au maximum."
          >
            <WeekdayField
              name="available_weekdays"
              labelledBy="t-days"
              days={weekdays}
              selected={values.available_weekdays ?? []}
            />
          </PreferenceRow>
          <PreferenceRow labelId="t-long" label="Jour de la sortie longue">
            <SegmentedField
              name="long_run_day"
              labelledBy="t-long"
              stretch
              selected={values.long_run_day ? [values.long_run_day] : []}
              options={[
                { value: "saturday", label: "Samedi" },
                { value: "sunday", label: "Dimanche" },
                { value: "flexible", label: "Flexible" },
              ]}
            />
          </PreferenceRow>
          <PreferenceRow labelId="t-time" label="Durée en semaine">
            <SegmentedField
              name="weekday_session_minutes"
              labelledBy="t-time"
              stretch
              selected={
                values.weekday_session_minutes
                  ? [String(values.weekday_session_minutes)]
                  : []
              }
              options={[45, 60, 75, 90].map((minutes) => ({
                value: String(minutes),
                label: minutes === 90 ? "90’+" : `${minutes}’`,
              }))}
            />
          </PreferenceRow>
          <PreferenceRow labelId="t-acc" label="Tu as accès à">
            <SegmentedField
              name="training_access"
              type="checkbox"
              labelledBy="t-acc"
              selected={values.training_access ?? []}
              options={access}
            />
          </PreferenceRow>
        </PreferenceSection>
        <Button type="submit" className="self-start">
          Enregistrer les préférences
        </Button>
      </form>
      <form action={saveSettingsGoal} className="flex flex-col gap-6">
        <input
          type="hidden"
          name="revision"
          value={goals.goal.revision ?? ""}
        />
        <PreferenceSection
          id="objectif"
          title="Objectif de saison"
          description={
            <>
              Tes courses se gèrent depuis{" "}
              <Link
                href="/races"
                className="font-medium text-primary hover:text-foreground"
              >
                Courses
              </Link>
              .
            </>
          }
        >
          <PreferenceRow labelId="t-focus" label="Quel est ton objectif ?">
            <select
              id="focus"
              name="focus"
              aria-labelledby="t-focus"
              defaultValue={goals.goal.values.focus ?? ""}
              className="h-control-auto w-full rounded-lg border border-input bg-card px-3 md:w-64"
            >
              {goalFocuses.map((focus) => (
                <option key={focus} value={focus}>
                  {focusLabels[focus]}
                </option>
              ))}
            </select>
          </PreferenceRow>
        </PreferenceSection>
        <Button type="submit" className="self-start">
          Enregistrer l’objectif
        </Button>
      </form>
      <PlanningSection
        constraints={planning}
        revision={planning.profileRevision}
        action={saveSettingsPlanning}
      />
      <UnavailabilitySection
        periods={currentPeriods(
          planning.unavailablePeriods,
          localToday(planning.timeZone),
        )}
        addAction={addSettingsUnavailability}
        removeAction={removeSettingsUnavailability}
      />
    </div>
  );
}
