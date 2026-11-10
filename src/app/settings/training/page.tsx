import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  PreferenceRow,
  PreferenceSection,
  SegmentedField,
  WeekdayField,
} from "@/features/settings/components/preferences";
import { SettingsNotice } from "@/features/settings/components/settings-notice";
import { requireAthleteAccount } from "@/server/app/session";
import { readProfile } from "@/server/onboarding/profile";
import {
  addSettingsUnavailability,
  removeSettingsUnavailability,
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
import { PushSettings } from "@/features/notifications/components/push-settings";
import { readPushSettings } from "@/server/push/preferences";

export const metadata: Metadata = { title: "Entraînement et coach · Réglages" };

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
export default async function TrainingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [context, query] = await Promise.all([
    requireAthleteAccount(),
    searchParams,
  ]);
  const [profile, planning, push] = await Promise.all([
    readProfile(context),
    readPlanningConstraints(context),
    readPushSettings(context),
  ]);
  const values = profile.values;
  return (
    <div className="flex flex-col gap-6 md:gap-10">
      <div className="flex flex-col gap-2 px-1 md:px-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:tracking-[-0.025em]">
          Entraînement et coach
        </h1>
        <p className="text-sm leading-normal text-secondary-foreground md:text-body">
          Ça guide mes plans. Changer tes disponibilités déclenchera une
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
            label="Jours de course"
            hint="5 max par semaine"
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
          <PreferenceRow labelId="t-acc" label="Accès à">
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
      <PushSettings
        publicKey={push.publicKey}
        preferences={push.preferences}
        endpoints={push.endpoints}
      />
    </div>
  );
}
