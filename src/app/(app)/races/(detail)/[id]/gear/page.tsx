import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Progress } from "@/components/ui/progress";
import { NavGearIcon } from "@/components/stride/nav-icons";
import { racePair } from "@/features/gear/break-in";
import { pairFacts } from "@/features/gear/planned";
import { pairSummaries, type ShoeInput } from "@/features/gear/view";
import {
  type ChecklistItem,
  type ChecklistList,
  checklistTemplateFor,
  prepLists,
  raceReadiness,
  readinessDetail,
  trailChecklistLists,
} from "@/features/races/checklists";
import {
  ChecklistGroup,
  DropBagCard,
} from "@/features/races/components/checklist-board";
import { PrintSheetButton } from "@/features/races/components/print-sheet-button";
import { Status } from "@/components/stride/status";
import {
  dropBagView,
  racePairView,
  type RacePairView,
} from "@/features/races/gear-view";
import { raceAllocation } from "@/features/races/race-nutrition";
import { readNutritionLibrary } from "@/server/fueling/products";
import { loadGear } from "@/server/gear/load";
import { readRaceFacts } from "@/server/gear/planned";
import { loadRace } from "@/server/races/load";
import type { RaceWorkspaceData } from "@/server/races/races";
import { withFuelingCap } from "@/features/fueling/tests";
import { planFor, weatherFor } from "@/server/races/views";
import { Suspense } from "react";
import { weatherGear } from "@/features/races/gear-weather";
import { GearAlongRace } from "@/features/races/components/gear-along-race";
import type { RacePlanModel } from "@/features/races/workspace";

function Readiness({
  items,
  lists,
}: {
  items: ChecklistItem[];
  lists: readonly ChecklistList[];
}) {
  const readiness = raceReadiness(items, lists);
  if (readiness.total === 0) return null;
  const percent = readiness.total
    ? Math.round((readiness.ready / readiness.total) * 100)
    : 0;
  return (
    <section
      aria-labelledby="gear-readiness"
      className="flex flex-col gap-2.5 border-b border-border pb-4.5 xl:sticky xl:top-0 xl:col-start-2 xl:row-start-1 xl:border-b-0 xl:border-l xl:pb-0 xl:pl-5 print:border-0"
    >
      <h2
        id="gear-readiness"
        className="text-label font-medium text-muted-foreground"
      >
        Préparation
      </h2>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          data-slot="metric"
          className="text-metric font-semibold whitespace-nowrap tabular-nums"
        >
          {readiness.ready} / {readiness.total}
        </span>
        <span className="text-body text-secondary-foreground">
          <span className="md:hidden">
            {readinessDetail(readiness, { short: true })}
          </span>
          <span className="max-md:hidden">{readinessDetail(readiness)}</span>
        </span>
      </div>
      <Progress
        value={percent}
        aria-label={`${readiness.ready} éléments prêts sur ${readiness.total}`}
        className="h-1.5 bg-muted"
      />
      <PrintSheetButton
        label="Imprimer la check-list"
        icon={false}
        size="md"
        className="self-start max-md:hidden"
      />
    </section>
  );
}

function groupKey(items: ChecklistItem[]) {
  return items
    .map(
      (item) =>
        `${item.id}:${item.revision}:${item.checked}:${item.status}:${item.shoeId}`,
    )
    .join(",");
}

function PairLead({ pair }: { pair: RacePairView | null }) {
  if (!pair)
    return (
      <p className="py-2.5 text-body text-secondary-foreground">
        Aucune paire choisie pour cette course. Lie une paire à une ligne
        ci-dessous ou réserve-la dans Matériel.
      </p>
    );
  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-2.5">
      <div className="flex items-center gap-3">
        <NavGearIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground max-md:hidden"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={`/activities/gear/${pair.id}`}
            className="self-start font-semibold hover:text-primary"
          >
            {pair.name}
          </Link>
          <span className="text-label text-muted-foreground">
            {pair.facts}
            <span className="max-md:hidden"> · {pair.terrain}</span>
          </span>
          {pair.raceDay && (
            <span className="text-label text-muted-foreground">
              {pair.raceDay}
            </span>
          )}
        </span>
        <Status level="ok">{pair.badge}</Status>
      </div>
      <p className="text-label text-secondary-foreground max-md:hidden">
        {pair.advice}
      </p>
    </div>
  );
}

function shoesFor(
  shoes: ShoeInput[],
  races: Awaited<ReturnType<typeof readRaceFacts>>,
  data: RaceWorkspaceData,
  today: string,
  dropBag: boolean,
) {
  const linked = data.checklist
    .filter((item) => item.list === "gear_kit" && item.shoeId)
    .map((item) => item.shoeId as string);
  const upcoming = races
    .filter((race) => race.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const chosen = racePair(
    {
      id: data.race.id,
      name: data.race.name,
      date: data.race.date ?? today,
      terrain: data.race.kind,
    },
    linked,
    shoes.map((shoe) => ({
      ...pairFacts(shoe),
      retired: shoe.retiredOn !== null,
    })),
    data.race.date ? upcoming : [],
    today,
  );
  const shoe = chosen && shoes.find((item) => item.id === chosen.pairId);
  return {
    pairs: pairSummaries(shoes),
    pair:
      chosen && shoe
        ? racePairView({
            shoe,
            source: chosen.source,
            raceDate: data.race.date,
            today,
            dropBag,
          })
        : null,
  };
}

async function GearWithWeather({
  data,
  views,
}: {
  data: RaceWorkspaceData;
  views: NonNullable<ReturnType<typeof planFor>> & { planned: RacePlanModel };
}) {
  const weather = data.race.date
    ? await weatherFor(data, views.model, views.planned)
    : null;
  return (
    <GearAlongRace
      items={weatherGear({
        weather,
        planned: views.planned,
        distanceM: views.model.course.distanceM,
      })}
      distanceM={views.model.course.distanceM}
      normals={weather?.mode === "normals"}
    />
  );
}

export default async function RaceGearPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { context, data, today } = await loadRace(id);
  const group = (
    list: ChecklistList,
    props: Partial<React.ComponentProps<typeof ChecklistGroup>> = {},
  ) => {
    const initial = data.checklist.filter((item) => item.list === list);
    return (
      <ChecklistGroup
        key={`${list}-${groupKey(initial)}`}
        raceId={id}
        raceKind={data.race.kind}
        list={list}
        initial={initial}
        {...props}
      />
    );
  };

  if (data.race.kind === "road")
    return (
      <div className="flex flex-col gap-4.5 xl:grid xl:grid-cols-[minmax(0,1fr)_var(--spacing-panel)] xl:items-start">
        <Readiness items={data.checklist} lists={prepLists} />
        <div className="grid items-start gap-3 md:grid-cols-3 xl:col-start-1 xl:row-start-1 print:grid-cols-3">
          {prepLists.map((list) => group(list))}
        </div>
      </div>
    );

  const libraryRead = readNutritionLibrary(context).catch(() => ({
    active: [],
    archived: [],
  }));
  const shoesRead = loadGear(context)
    .then((gear): ShoeInput[] => gear.shoes)
    .catch((): ShoeInput[] => []);
  const racesRead = readRaceFacts(context).catch(() => []);
  const [library, shoes, races] = await Promise.all([
    libraryRead,
    shoesRead,
    racesRead,
  ]);
  const views = planFor(data, "target");
  const allocation = views?.planned
    ? raceAllocation({
        model: views.model,
        planned: views.planned,
        plan: withFuelingCap(data.plan, data.fuelingCapG ?? null),
        nutritionPlan: data.nutritionPlan?.plan ?? null,
        dropBagExtras: data.dropBag?.extras ?? [],
        products: library.active,
        archivedProducts: library.archived,
      })
    : null;
  const bags = dropBagView(data.waypoints, allocation);
  const { pairs, pair } = shoesFor(shoes, races, data, today, bags.length > 0);
  const mandatory = data.checklist.filter(
    (item) => item.list === "gear_mandatory",
  );
  const templateLabels = new Set(
    checklistTemplateFor("trail", "gear_mandatory")?.map((item) => item.label),
  );
  const fromTemplate = mandatory.some((item) => templateLabels.has(item.label));

  return (
    <div className="flex flex-col gap-4.5 xl:grid xl:grid-cols-[minmax(0,1fr)_var(--spacing-panel)] xl:items-start">
      <Readiness items={data.checklist} lists={trailChecklistLists} />
      {views?.planned && (
        <div className="xl:col-start-1 xl:row-start-1 print:hidden">
          <Suspense fallback={null}>
            <GearWithWeather
              data={data}
              views={{ ...views, planned: views.planned }}
            />
          </Suspense>
        </div>
      )}
      {data.details.poles && data.details.poles !== "unknown" && (
        <p className="flex items-center gap-2 text-body xl:col-start-1">
          <span className="font-medium">Bâtons</span>
          <span
            className={
              data.details.poles === "forbidden"
                ? "text-warning"
                : "text-secondary-foreground"
            }
          >
            {data.details.poles === "forbidden"
              ? "interdits sur cette course"
              : "autorisés sur cette course"}
          </span>
        </p>
      )}
      <div className="grid items-start gap-3 lg:grid-cols-2 xl:col-start-1 print:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          {group("gear_kit", {
            pairs,
            lead: <PairLead pair={pair} />,
            aside: (
              <Link
                href="/activities/gear"
                className="text-label text-primary hover:text-foreground max-md:hidden print:hidden"
              >
                Matériel
              </Link>
            ),
            empty: null,
          })}
          {group("gear_mandatory", {
            aside: fromTemplate && (
              <span className="max-md:hidden">
                à vérifier avec le règlement
              </span>
            ),
          })}
          {group("gear_night")}
          {group("gear_weather")}
          {group("gear_forbidden")}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {bags.map((bag, index) => (
            <DropBagCard
              key={`${bag.stationId}-${data.dropBag?.revision ?? 0}`}
              raceId={id}
              km={bag.km}
              nutrition={bag.nutrition}
              extras={index === 0 ? (data.dropBag?.extras ?? []) : null}
              revision={data.dropBag?.revision ?? null}
            />
          ))}
          {prepLists.map((list) => group(list))}
        </div>
      </div>
    </div>
  );
}
