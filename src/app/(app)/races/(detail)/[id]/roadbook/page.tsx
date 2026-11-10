import { Suspense } from "react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { Widget } from "@/components/stride/widget";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { coachRequestHref } from "@/features/coach/request";
import { PlanProfile } from "@/features/races/components/plan-profile";
import { PlanTimeline } from "@/features/races/components/plan-timeline";
import { PrintSheetButton } from "@/features/races/components/print-sheet-button";
import { RaceProposalSheet } from "@/features/races/components/race-proposal-sheet";
import { EmptyState } from "@/features/races/components/race-ui";
import { StopsEditor } from "@/features/races/components/stops-editor";
import { TargetMissing } from "@/features/races/components/target-missing";
import {
  formatClock,
  formatDuration,
  formatHours,
} from "@/features/races/format";
import { profileData } from "@/features/races/profile";
import { reviewSegments } from "@/features/races/proposal-review";
import {
  changeCountLabel,
  emptyStrategy,
  strategyChanges,
  type RaceProposal,
} from "@/features/races/proposals";
import { raceAllocation } from "@/features/races/race-nutrition";
import { raceStrategy } from "@/features/races/reading";
import {
  planProfile,
  raceTimeline,
  timelineFueling,
  type PlanProfileData,
  type TimelineTotals,
} from "@/features/races/timeline";
import { isStation } from "@/features/races/waypoints";
import type { RaceWeather } from "@/features/races/weather";
import type { Scenario, ScenarioKey } from "@/features/races/workspace";
import type { NutritionProduct } from "@/features/fueling/products";
import { readNutritionLibrary } from "@/server/fueling/products";
import { loadRace } from "@/server/races/load";
import {
  loadRaceProposalReview,
  readReadyRaceProposals,
} from "@/server/races/proposals";
import type { RaceWorkspaceData } from "@/server/races/races";
import { planFor, weatherFor } from "@/server/races/views";

const scenarioSchema = z
  .enum(["ambitious", "target", "cautious"])
  .catch("target");

const scenarioNames: Record<ScenarioKey, string> = {
  ambitious: "Ambitieux",
  target: "Cible",
  cautious: "Prudent",
};

type Views = NonNullable<ReturnType<typeof planFor>>;
type Planned = NonNullable<Views["planned"]>;
type StrategyProposal = Extract<RaceProposal, { kind: "strategy" }>;

function marginText(seconds: number) {
  return `${seconds < 0 ? "−" : ""}${formatHours(Math.abs(seconds))}`;
}

function ScenarioChips({
  scenarios,
  current,
  base,
}: {
  scenarios: Scenario[];
  current: ScenarioKey;
  base: string;
}) {
  return (
    <nav
      aria-label="Scénario"
      className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg border border-border bg-card p-0.5 max-sm:w-full"
    >
      {scenarios.map((scenario) => (
        <Link
          key={scenario.key}
          href={
            scenario.key === "target"
              ? `${base}/roadbook`
              : `${base}/roadbook?scenario=${scenario.key}`
          }
          scroll={false}
          aria-current={scenario.key === current ? "true" : undefined}
          className={cn(
            "flex min-h-control-touch shrink-0 items-center justify-center gap-1 rounded-md px-2.5 whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground max-sm:flex-1 md:min-h-6",
            scenario.key === current && "bg-muted font-medium text-foreground",
          )}
        >
          {scenarioNames[scenario.key]} ·{" "}
          <span className="max-md:hidden">{formatHours(scenario.seconds)}</span>
          <span className="md:hidden">{formatDuration(scenario.seconds)}</span>
        </Link>
      ))}
    </nav>
  );
}

function StrategistCard({
  data,
  views,
  planned,
  proposal,
}: {
  data: RaceWorkspaceData;
  views: Views;
  planned: Planned | null;
  proposal: StrategyProposal | null;
}) {
  const accepted = data.strategy?.consignes ?? [];
  const consignes = accepted.length
    ? accepted
    : planned
      ? raceStrategy({
          model: views.model,
          planned,
          walkGrade: data.plan.walkGradePercent,
          walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
        }).map((item) => item.title)
      : [];
  const changes = proposal
    ? strategyChanges(
        data.strategy ?? emptyStrategy,
        proposal.payload,
        reviewSegments(
          views.model,
          planned,
          null,
          data.plan.walkPaceSecondsPerKm,
        ),
      ).length
    : 0;
  const base = `/races/${data.race.id}/roadbook`;
  return (
    <section
      aria-labelledby="consignes-strategiste"
      className="flex flex-col gap-2.5"
    >
      <div className="flex items-center gap-2">
        <StrideMark className="size-3 shrink-0" />
        <h2
          id="consignes-strategiste"
          className="text-label font-medium text-secondary-foreground"
        >
          Consignes du stratège
        </h2>
        {proposal && (
          <Chip proposal className="ml-auto max-md:hidden">
            {changeCountLabel(changes)}
          </Chip>
        )}
      </div>
      {consignes.length > 0 ? (
        <ol className="flex max-w-170 list-decimal flex-col gap-1.5 pl-4.5 text-body-lg text-pretty">
          {consignes.map((consigne, index) => (
            <li key={index}>{consigne}</li>
          ))}
        </ol>
      ) : (
        <p className="text-body text-secondary-foreground">
          Fixe ton objectif pour que le stratège prépare tes consignes.
        </p>
      )}
      <div className="mt-1 flex flex-col gap-2 md:flex-row md:flex-wrap print:hidden">
        {proposal && (
          <Button asChild>
            <Link
              href={`${base}?proposal=${proposal.id}`}
              scroll={false}
              data-proposal-id={proposal.id}
            >
              <span className="max-md:hidden">Examiner les changements</span>
              <span className="md:hidden">
                Examiner les {changeCountLabel(changes)}
              </span>
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link
            href={coachRequestHref(
              "Construisons ma stratégie de course avec le stratège.",
              null,
              data.race.id,
            )}
          >
            Construire ma stratégie avec le stratège
          </Link>
        </Button>
      </div>
    </section>
  );
}

const panelHeading = "text-label font-medium text-muted-foreground";
const panelSection =
  "flex flex-col gap-2.5 border-b border-border py-4.5 first:pt-0 last:border-b-0";

function Aside({
  data,
  totals,
  profile,
}: {
  data: RaceWorkspaceData;
  totals: TimelineTotals;
  profile: PlanProfileData;
}) {
  const stations = data.waypoints.filter((point) => isStation(point.kind));
  const counts = new Map<number, number>();
  for (const point of stations)
    counts.set(
      point.alertDistanceM,
      (counts.get(point.alertDistanceM) ?? 0) + 1,
    );
  const alert =
    [...counts.entries()].sort((a, b) => b[1] - a[1]).at(0)?.[0] ?? 0;
  const late = (totals.finishMarginSeconds ?? 0) < 0;
  const figures: [string, number][] = [
    ["Course", totals.runSeconds],
    ["Marche", totals.walkSeconds],
    ["Arrêts", totals.stopSeconds],
    ["Nuit", totals.nightSeconds],
  ];
  return (
    <aside
      aria-label="Résumé du plan de course"
      className="flex flex-col max-xl:hidden xl:w-panel xl:shrink-0 print:hidden"
    >
      <section aria-labelledby="plan-where" className={panelSection}>
        <h2 id="plan-where" className={panelHeading}>
          Où tu en es
        </h2>
        <PlanProfile data={profile} variant="card" />
      </section>
      <section aria-labelledby="plan-arrival" className={panelSection}>
        <h2 id="plan-arrival" className={panelHeading}>
          Arrivée prévue
        </h2>
        <span
          data-slot="metric"
          className="text-metric font-semibold tabular-nums"
        >
          {formatClock(totals.finishClockMinutes)}
        </span>
        {totals.finishCutoffMinutes !== null &&
          totals.finishMarginSeconds !== null && (
            <span
              className={cn(
                "text-body",
                late ? "text-destructive" : "text-primary",
              )}
            >
              barrière {formatClock(totals.finishCutoffMinutes)} · marge{" "}
              {marginText(totals.finishMarginSeconds)}
            </span>
          )}
        <dl className="flex flex-col">
          {figures.map(([label, seconds]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0"
            >
              <dt className="text-secondary-foreground">{label}</dt>
              <dd
                data-slot="metric"
                className="font-semibold text-foreground tabular-nums"
              >
                {label === "Arrêts" ? (
                  <StopsEditor
                    raceId={data.race.id}
                    revision={data.plan.revision}
                    aidStopSeconds={data.plan.aidStopSeconds}
                    waterStopSeconds={data.plan.waterStopSeconds}
                  >
                    {formatHours(seconds)}
                  </StopsEditor>
                ) : (
                  formatHours(seconds)
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="plan-points" className={panelSection}>
        <h2 id="plan-points" className={panelHeading}>
          Points de passage
        </h2>
        <span className="text-body text-secondary-foreground">
          {data.waypoints.length} point{data.waypoints.length > 1 ? "s" : ""} ·{" "}
          {stations.length} ravito{stations.length > 1 ? "s" : ""} ·{" "}
          {alert > 0 ? `alertes à ${alert} m` : "sans alerte"}
        </span>
        <Link
          href={`/races/${data.race.id}/waypoints`}
          className="w-fit text-body text-primary hover:text-foreground"
        >
          Modifier les points
        </Link>
      </section>
    </aside>
  );
}

type BodyProps = {
  data: RaceWorkspaceData;
  views: Views;
  planned: Planned;
  proposal: StrategyProposal | null;
  products: { active: NutritionProduct[]; archived: NutritionProduct[] };
};

function PlanBody({
  data,
  views,
  planned,
  proposal,
  products,
  weather,
}: BodyProps & { weather: RaceWeather | null }) {
  const base = `/races/${data.race.id}`;
  const timeline = raceTimeline({
    model: views.model,
    planned,
    weather,
    strategy: data.strategy,
    fueling: timelineFueling(
      raceAllocation({
        model: views.model,
        planned,
        plan: data.plan,
        nutritionPlan: data.nutritionPlan?.plan ?? null,
        dropBagExtras: data.dropBag?.extras ?? [],
        products: products.active,
        archivedProducts: products.archived,
        weather,
      }),
    ),
    stops: data.plan,
    walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
  });
  const profile = planProfile(
    profileData({
      course: views.model.course,
      waypoints: views.model.waypoints,
      marks: views.model.marks,
      portions: views.model.portions,
      planned,
      weather,
    }),
    timeline,
  );
  const { totals } = timeline;
  const caption = [
    `arrivée prévue ${formatClock(totals.finishClockMinutes)}`,
    totals.finishMarginSeconds !== null
      ? `marge ${marginText(totals.finishMarginSeconds)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-border bg-background py-1.5 xl:hidden print:hidden">
        <PlanProfile data={profile} variant="sticky" caption={caption} />
      </div>
      <section
        aria-label="Scénario et actions"
        className="flex flex-wrap items-center gap-2 print:hidden"
      >
        <ScenarioChips
          scenarios={views.scenarios}
          current={planned.scenario.key}
          base={base}
        />
        <div className="ml-auto flex gap-2 max-md:hidden">
          <PrintSheetButton
            label="Imprimer le roadbook"
            icon={false}
            size="md"
          />
          <Button asChild variant="outline">
            <Link href={`${base}/waypoints#montre`}>Envoyer à la montre</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/waypoints`}>Modifier les points</Link>
          </Button>
        </div>
      </section>
      <p className="hidden text-body font-semibold print:block">
        Scénario {scenarioNames[planned.scenario.key].toLowerCase()} ·{" "}
        {formatHours(planned.scenario.seconds)}
      </p>
      <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-6 print:block">
        <div className="flex min-w-0 flex-1 flex-col gap-4.5">
          <StrategistCard
            data={data}
            views={views}
            planned={planned}
            proposal={proposal}
          />
          {!planned.simulation.feasible && (
            <p role="status" className="text-body text-warning">
              Cet objectif est hors de portée avec la marche et les arrêts
              prévus : la simulation est à revoir.
            </p>
          )}
          <Widget
            headingLevel={2}
            title={<span id="plan-de-course">Plan de course</span>}
            verdict={
              <span className="text-label font-normal text-muted-foreground">
                {timeline.segments.length} tronçon
                {timeline.segments.length > 1 ? "s" : ""} · {caption}
              </span>
            }
            aria-labelledby="plan-de-course"
            className="print:border-0 print:bg-transparent print:p-0 print:[&>div]:border-0 print:[&>div]:p-0 print:[&>header]:hidden"
          >
            <PlanTimeline timeline={timeline} raceId={data.race.id} />
          </Widget>
        </div>
        <Aside data={data} totals={totals} profile={profile} />
      </section>
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-body text-secondary-foreground xl:hidden print:hidden">
        Arrêts prévus ·
        <span
          data-slot="metric"
          className="font-semibold text-foreground tabular-nums"
        >
          <StopsEditor
            raceId={data.race.id}
            revision={data.plan.revision}
            aidStopSeconds={data.plan.aidStopSeconds}
            waterStopSeconds={data.plan.waterStopSeconds}
          >
            {formatHours(totals.stopSeconds)}
          </StopsEditor>
        </span>
      </p>
      <div className="flex flex-col gap-2 md:hidden print:hidden">
        <PrintSheetButton label="Imprimer le roadbook" icon={false} size="md" />
        <Button asChild variant="outline">
          <Link href={`${base}/waypoints`}>Modifier les points</Link>
        </Button>
      </div>
    </>
  );
}

async function PlanWithWeather({
  weather,
  ...props
}: BodyProps & { weather: Promise<RaceWeather | null> }) {
  return <PlanBody {...props} weather={await weather} />;
}

export default async function RoadbookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { context, data } = await loadRace(id);
  if (data.race.kind === "road") redirect(`/races/${id}`);
  const [review, proposals, products] = await Promise.all([
    loadRaceProposalReview(
      context,
      data,
      typeof query.proposal === "string" ? query.proposal : undefined,
      scenarioSchema.parse(query.scenario),
    ),
    readReadyRaceProposals(context, data.race.id),
    readNutritionLibrary(context),
  ]);
  const sheet = review && <RaceProposalSheet key={review.id} review={review} />;
  const base = `/races/${id}`;
  if (!data.course)
    return (
      <>
        {sheet}
        <Widget
          headingLevel={2}
          title={<span id="plan-de-course">Plan de course</span>}
          aria-labelledby="plan-de-course"
        >
          <EmptyState title="Ajoute le parcours">
            <span>
              Importe un GPX pour préparer ton roadbook et placer les points de
              passage.
            </span>
            <Button asChild variant="outline">
              <Link href={`${base}/course`}>Importer un GPX</Link>
            </Button>
          </EmptyState>
        </Widget>
      </>
    );

  const views = planFor(data, scenarioSchema.parse(query.scenario))!;
  const planned = views.planned;
  const proposal =
    proposals.find(
      (item): item is StrategyProposal => item.kind === "strategy",
    ) ?? null;
  if (!planned)
    return (
      <>
        {sheet}
        <TargetMissing race={data.race} plan={data.plan} />
        <StrategistCard
          data={data}
          views={views}
          planned={null}
          proposal={proposal}
        />
      </>
    );
  const props = { data, views, planned, proposal, products };
  if (!data.race.date || planned.startEpochMs === null)
    return (
      <>
        {sheet}
        <PlanBody {...props} weather={null} />
      </>
    );
  return (
    <>
      {sheet}
      <Suspense fallback={<PlanBody {...props} weather={null} />}>
        <PlanWithWeather
          {...props}
          weather={weatherFor(data, views.model, planned)}
        />
      </Suspense>
    </>
  );
}
