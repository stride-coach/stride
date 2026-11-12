import type { Metadata } from "next";
import { localToday } from "@/features/app-shell/shell";
import { racePriorities } from "@/features/onboarding/goals";
import { RaceForm } from "@/features/races/components/race-form";
import { RaceFormFrame } from "@/features/races/components/race-form-frame";
import { requireAthlete } from "@/server/app/session";
import { loadRaceForm } from "@/server/races/goal-form";
import { nextEditionDate } from "@/features/races/editions";
import { z } from "zod";

export const metadata: Metadata = { title: "Ajouter une course · Courses" };

export default async function NewRacePage({
  searchParams,
}: {
  searchParams: Promise<{
    priority?: string | string[];
    from?: string | string[];
  }>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const today = localToday(new Date());
  const from = z.uuid().safeParse(query.from);
  const { primaryName, hasPlan, references } = await loadRaceForm(
    context,
    null,
  );
  const source = from.success
    ? (await loadRaceForm(context, from.data)).race
    : null;
  const sourceDate = source?.values.race_date ?? null;
  const template =
    source && sourceDate
      ? {
          values: {
            ...source.values,
            name: (source.values.name ?? "")
              .replace(/\s*\b(19|20)\d{2}\b/g, "")
              .trim(),
            race_date: nextEditionDate(sourceDate, today),
            target_duration_seconds: null,
          },
          startTime: source.startTime,
          cutoffSeconds: source.cutoffSeconds,
          details: { ...source.details, expectation: null, testItems: [] },
          note: `Pré-remplie d’après l’édition ${sourceDate.slice(0, 4)}. La date est estimée : vérifie-la sur le site de la course.`,
        }
      : undefined;
  const priority =
    racePriorities.find((item) => item === query.priority) ??
    source?.values.priority ??
    "B";
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
        template={template}
        references={references}
        today={today}
        cancelHref="/races"
      />
    </RaceFormFrame>
  );
}
