import { Suspense } from "react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { fuelingRehearsals, type FuelingRace } from "@/features/fueling/base";
import { emptyNutritionPlan } from "@/features/fueling/race-plan";
import {
  CardLabel,
  EmptyState,
  RaceCard,
} from "@/features/races/components/race-ui";
import {
  NutritionBody,
  ProductsCard,
  type NutritionBodyProps,
} from "@/features/races/components/race-nutrition";
import { RaceProposalSheet } from "@/features/races/components/race-proposal-sheet";
import type { UpcomingSession } from "@/features/races/nutrition-view";
import {
  nutritionTargetsOf,
  reviewSegments,
} from "@/features/races/proposal-review";
import {
  nutritionChanges,
  type RaceProposal,
} from "@/features/races/proposals";
import type { RaceWeather } from "@/features/races/weather";
import { readNutritionLibrary } from "@/server/fueling/products";
import { readActivePlan } from "@/server/plans/stored";
import { loadRace } from "@/server/races/load";
import {
  loadRaceProposalReview,
  readProductNames,
  readReadyRaceProposals,
} from "@/server/races/proposals";
import { planFor, weatherFor } from "@/server/races/views";

const scenarioSchema = z
  .enum(["ambitious", "target", "cautious"])
  .catch("target");

type NutritionProposal = Extract<RaceProposal, { kind: "nutrition" }>;

async function NutritionWithWeather({
  weather,
  ...props
}: NutritionBodyProps & { weather: Promise<RaceWeather | null> }) {
  return <NutritionBody {...props} weather={await weather} />;
}

function upcomingSessions(
  stored: Awaited<ReturnType<typeof readActivePlan>>,
  today: string,
  race: FuelingRace | null,
): UpcomingSession[] {
  return fuelingRehearsals({
    sessions: (stored?.state.sessions ?? [])
      .filter((session) => session.sport !== "rest" && session.kind !== "rest")
      .map((session) => ({
        sessionKey: session.sessionKey,
        date: session.scheduledOn,
        title: session.title,
        durationSeconds: session.targets.durationSeconds,
      })),
    from: today,
    race,
  });
}

export default async function NutritionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { context, data, today } = await loadRace(id);
  if (data.race.kind === "road") redirect(`/races/${id}`);
  const [review, proposals, products, stored, names] = await Promise.all([
    loadRaceProposalReview(
      context,
      data,
      typeof query.proposal === "string" ? query.proposal : undefined,
      scenarioSchema.parse(query.scenario),
    ),
    readReadyRaceProposals(context, data.race.id),
    readNutritionLibrary(context),
    readActivePlan(context).catch(() => null),
    readProductNames(context),
  ]);
  const sheet = review && <RaceProposalSheet key={review.id} review={review} />;
  const fuelingRace: FuelingRace | null = data.race.date
    ? {
        id: data.race.id,
        name: data.race.name,
        kind: data.race.kind,
        date: data.race.date,
        targets: {
          carbsPerHourG: data.plan.carbsPerHourG,
          waterMlPerHour: data.plan.waterMlPerHour,
          sodiumMgPerHour: data.plan.sodiumMgPerHour,
        },
      }
    : null;
  const sessions = upcomingSessions(stored, today, fuelingRace);
  const views = planFor(data, scenarioSchema.parse(query.scenario));
  const productsCard = (
    <ProductsCard products={products.active} sessions={sessions} />
  );

  if (!views?.planned)
    return (
      <>
        {sheet}
        <RaceCard>
          <CardLabel>Nutrition de course</CardLabel>
          <EmptyState
            title="Prépare ton plan de nutrition"
            action={
              <Button asChild variant="outline" size="md">
                <Link href={`/races/${id}${data.course ? "" : "/course"}`}>
                  {data.course
                    ? "Définir un objectif de temps"
                    : "Ajouter un parcours GPX"}
                </Link>
              </Button>
            }
          >
            {data.course
              ? "Définis un objectif de temps dans les réglages de la course pour calculer les quantités par tronçon."
              : "Ajoute un parcours GPX et un objectif de temps pour calculer les quantités par tronçon."}
          </EmptyState>
        </RaceCard>
        {productsCard}
      </>
    );

  const planned = views.planned;
  const waiting =
    proposals.find(
      (item): item is NutritionProposal => item.kind === "nutrition",
    ) ?? null;
  const proposal = waiting
    ? {
        id: waiting.id,
        changes: nutritionChanges(
          {
            targets: nutritionTargetsOf(data.plan),
            plan: data.nutritionPlan?.plan ?? emptyNutritionPlan,
          },
          waiting.payload,
          reviewSegments(
            views.model,
            planned,
            null,
            data.plan.walkPaceSecondsPerKm,
          ),
          names,
        ).length,
      }
    : null;
  const props: NutritionBodyProps = {
    data,
    model: views.model,
    planned,
    products: products.active,
    archivedProducts: products.archived,
    sessions,
    proposal,
  };
  return (
    <>
      {sheet}
      {!data.race.date || planned.startEpochMs === null ? (
        <NutritionBody {...props} weather={null} />
      ) : (
        <Suspense fallback={<NutritionBody {...props} weather={null} />}>
          <NutritionWithWeather
            {...props}
            weather={weatherFor(data, views.model, planned)}
          />
        </Suspense>
      )}
      {productsCard}
    </>
  );
}
