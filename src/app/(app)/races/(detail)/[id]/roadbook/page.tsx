import { Suspense } from "react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/stride/mono-label";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { coachRequestHref } from "@/features/coach/request";
import { PlanProfile } from "@/features/races/components/plan-profile";
import { PlanTimeline } from "@/features/races/components/plan-timeline";
import { PrintSheetButton } from "@/features/races/components/print-sheet-button";
import { RaceProposalSheet } from "@/features/races/components/race-proposal-sheet";
import { EmptyState, RaceCard } from "@/features/races/components/race-ui";
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
    <div className="flex gap-1.5 overflow-x-auto max-md:-mx-5 max-md:px-5 md:flex-wrap md:items-center md:gap-2.5">
      <MonoLabel size="micro" className="mr-1.5 max-md:hidden">
        Scénario
      </MonoLabel>
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
            "inline-flex min-h-8.5 shrink-0 items-center rounded-full border border-border-strong px-3 text-meta whitespace-nowrap text-muted transition-colors hover:text-foreground",
            scenario.key === current &&
              "border-foreground bg-foreground font-semibold text-background hover:text-background",
          )}
        >
          {scenarioNames[scenario.key]} ·{" "}
          <span className="max-md:hidden">{formatHours(scenario.seconds)}</span>
          <span className="md:hidden">{formatDuration(scenario.seconds)}</span>
        </Link>
      ))}
    </div>
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
    <RaceCard
      aria-labelledby="consignes-strategiste"
      className="mb-3 gap-3.5 px-4 py-4 sm:px-6 sm:py-5.5 print:border-0 print:p-0"
    >
      <div className="flex items-center gap-2 md:gap-2.5">
        <StrideMark className="size-3.5" />
        <MonoLabel asChild size="micro" tone="foreground">
          <h2 id="consignes-strategiste">Consignes du stratège</h2>
        </MonoLabel>
        {proposal && (
          <span className="ml-auto inline-flex items-center rounded-full border border-warning/30 px-2.25 py-0.5 text-xs whitespace-nowrap text-warning max-md:hidden">
            {changeCountLabel(changes)}
          </span>
        )}
      </div>
      {consignes.length > 0 ? (
        <ol className="flex list-decimal flex-col gap-1.5 pl-4.5 text-meta leading-normal md:text-sm">
          {consignes.map((consigne, index) => (
            <li key={index}>{consigne}</li>
          ))}
        </ol>
      ) : (
        <p className="text-meta text-muted">
          Fixe ton objectif pour que le stratège prépare tes consignes.
        </p>
      )}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap print:hidden">
        {proposal && (
          <Button
            asChild
            size="md"
            className="rounded-surface text-meta max-md:min-h-11"
          >
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
        <Button
          asChild
          variant="outline"
          size="md"
          className="rounded-surface text-meta max-md:min-h-11"
        >
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
    </RaceCard>
  );
}

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
      className="sticky top-5 flex flex-col gap-3.5 max-lg:hidden print:hidden"
    >
      <RaceCard className="gap-2.5 p-4 sm:p-4">
        <MonoLabel asChild size="micro">
          <h2>Où tu en es</h2>
        </MonoLabel>
        <PlanProfile data={profile} variant="card" />
      </RaceCard>
      <RaceCard className="gap-2 p-4 sm:p-4">
        <MonoLabel asChild size="micro">
          <h2>Arrivée prévue</h2>
        </MonoLabel>
        <span className="font-metric text-[2.25rem] leading-none font-semibold tabular-nums">
          {formatClock(totals.finishClockMinutes)}
        </span>
        {totals.finishCutoffMinutes !== null &&
          totals.finishMarginSeconds !== null && (
            <span
              className={cn("text-meta", late ? "text-danger" : "text-success")}
            >
              barrière {formatClock(totals.finishCutoffMinutes)} · marge{" "}
              {marginText(totals.finishMarginSeconds)}
            </span>
          )}
        <dl className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-2 text-xs text-muted">
          {figures.map(([label, seconds]) => (
            <div key={label} className="flex items-baseline gap-1">
              <dt>{label}</dt>
              <dd className="font-metric text-[0.9375rem] font-semibold text-foreground tabular-nums">
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
      </RaceCard>
      <RaceCard className="gap-1.5 p-4 sm:p-4">
        <MonoLabel asChild size="micro">
          <h2>Points de passage</h2>
        </MonoLabel>
        <span className="text-meta text-muted">
          {data.waypoints.length} point{data.waypoints.length > 1 ? "s" : ""} ·{" "}
          {stations.length} ravito{stations.length > 1 ? "s" : ""} ·{" "}
          {alert > 0 ? `alertes à ${alert} m` : "sans alerte"}
        </span>
        <Link
          href={`/races/${data.race.id}/waypoints`}
          className="text-meta text-accent hover:text-foreground"
        >
          Modifier les points →
        </Link>
      </RaceCard>
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
      <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-border bg-surface-inset py-1.5 lg:hidden print:hidden">
        <PlanProfile data={profile} variant="sticky" caption={caption} />
      </div>
      <section
        aria-label="Scénario et actions"
        className="flex flex-wrap items-center gap-2.5 print:hidden"
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
            className="rounded-surface text-meta"
          />
          <Button
            asChild
            variant="outline"
            size="md"
            className="rounded-surface text-meta"
          >
            <Link href={`${base}/waypoints#montre`}>Envoyer à la montre</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="md"
            className="rounded-surface text-meta"
          >
            <Link href={`${base}/waypoints`}>Modifier les points</Link>
          </Button>
        </div>
      </section>
      <p className="hidden text-sm font-semibold print:block">
        Scénario {scenarioNames[planned.scenario.key].toLowerCase()} ·{" "}
        {formatHours(planned.scenario.seconds)}
      </p>
      <section className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px] print:block">
        <div className="flex min-w-0 flex-col">
          <StrategistCard
            data={data}
            views={views}
            planned={planned}
            proposal={proposal}
          />
          {!planned.simulation.feasible && (
            <p role="status" className="py-2 text-sm text-warning">
              Cet objectif est hors de portée avec la marche et les arrêts
              prévus : la simulation est à revoir.
            </p>
          )}
          <PlanTimeline timeline={timeline} raceId={data.race.id} />
        </div>
        <Aside data={data} totals={totals} profile={profile} />
      </section>
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-meta text-muted lg:hidden print:hidden">
        Arrêts prévus ·
        <span className="font-metric text-[0.9375rem] font-semibold text-foreground tabular-nums">
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
        <PrintSheetButton
          label="Imprimer le roadbook"
          icon={false}
          size="md"
          className="min-h-11 rounded-surface text-meta"
        />
        <Button
          asChild
          variant="outline"
          size="md"
          className="min-h-11 rounded-surface text-meta"
        >
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
        <RaceCard>
          <EmptyState title="Ajoute le parcours">
            <span>
              Importe un GPX pour préparer ton roadbook et placer les points de
              passage.
            </span>
            <Button asChild variant="outline">
              <Link href={`${base}/course`}>Importer un GPX</Link>
            </Button>
          </EmptyState>
        </RaceCard>
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
