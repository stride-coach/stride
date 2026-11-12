import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { localToday } from "@/features/app-shell/shell";
import { RaceForm } from "@/features/races/components/race-form";
import { RaceFormFrame } from "@/features/races/components/race-form-frame";
import { requireAthlete } from "@/server/app/session";
import { loadRaceForm } from "@/server/races/goal-form";

export const metadata: Metadata = { title: "Modifier la course · Courses" };

export default async function EditRacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [context, { id }] = await Promise.all([requireAthlete(), params]);
  if (!z.uuid().safeParse(id).success) notFound();
  const { race, primaryName, hasPlan } = await loadRaceForm(context, id);
  if (!race) notFound();
  const name = race.values.name ?? "Course";
  const href = `/races/${race.id}`;
  return (
    <RaceFormFrame
      title="Modifier la course"
      crumbs={[
        { label: "Courses", href: "/races" },
        { label: name, href },
        { label: "Modifier" },
      ]}
      back={{ href, label: "Retour à la course" }}
    >
      <RaceForm
        mode="edit"
        race={race}
        defaultPriority={race.values.priority ?? "B"}
        primaryName={primaryName}
        hasPlan={hasPlan}
        today={localToday(new Date())}
        cancelHref={href}
      />
    </RaceFormFrame>
  );
}
