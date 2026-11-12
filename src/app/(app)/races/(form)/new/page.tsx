import type { Metadata } from "next";
import { localToday } from "@/features/app-shell/shell";
import { racePriorities } from "@/features/onboarding/goals";
import { RaceForm } from "@/features/races/components/race-form";
import { RaceFormFrame } from "@/features/races/components/race-form-frame";
import { requireAthlete } from "@/server/app/session";
import { loadRaceForm } from "@/server/races/goal-form";

export const metadata: Metadata = { title: "Ajouter une course · Courses" };

export default async function NewRacePage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string | string[] }>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const { primaryName, hasPlan } = await loadRaceForm(context, null);
  const priority =
    racePriorities.find((item) => item === query.priority) ?? "B";
  return (
    <RaceFormFrame
      title="Ajouter une course"
      crumbs={[
        { label: "Courses", href: "/races" },
        { label: "Ajouter une course" },
      ]}
      back={{ href: "/races", label: "Retour aux courses" }}
    >
      <RaceForm
        mode="create"
        defaultPriority={priority}
        primaryName={primaryName}
        hasPlan={hasPlan}
        today={localToday(new Date())}
        cancelHref="/races"
      />
    </RaceFormFrame>
  );
}
