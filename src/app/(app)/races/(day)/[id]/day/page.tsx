import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { RaceDay } from "@/features/races/components/race-day";
import { EmptyState } from "@/features/races/components/race-ui";
import { raceDayWindow } from "@/features/races/race-day";
import { readNutritionLibrary } from "@/server/fueling/products";
import { readRaceCheckins } from "@/server/races/checkins";
import { loadRace } from "@/server/races/load";
import { raceDayFor } from "@/server/races/views";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { data } = await loadRace((await params).id);
  return { title: `${data.race.name} · Jour J` };
}

export default async function RaceDayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { context, data, today } = await loadRace(id);
  if (raceDayWindow(data.race.date, today) !== "open") redirect(`/races/${id}`);
  const [plan, checkins] = await Promise.all([
    readNutritionLibrary(context).then((products) =>
      raceDayFor(data, products),
    ),
    readRaceCheckins(context, id),
  ]);
  const renderedAt = new Date().getTime();
  return (
    <>
      <AppHeader
        title={data.race.name}
        detail="Jour J"
        back={{ href: `/races/${id}`, label: "Retour à la course" }}
      />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col px-4 pt-3 pb-18 md:px-5 md:pb-6">
          {plan ? (
            <RaceDay plan={plan} checkins={checkins} renderedAt={renderedAt} />
          ) : (
            <EmptyState title="Pas de plan pour le jour J">
              Ajoute un objectif de temps à la course pour préparer ton plan du
              jour J.
            </EmptyState>
          )}
        </main>
      </div>
    </>
  );
}
