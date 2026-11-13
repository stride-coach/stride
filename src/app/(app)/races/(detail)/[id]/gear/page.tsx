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
import { planFor, timelineFor, weatherFor } from "@/server/races/views";
import { Suspense } from "react";
import { StrideMark } from "@/components/stride/stride-mark";
import { formatClock } from "@/features/races/format";
import {
  gearReading,
  gearTimeline,
  weatherGear,
} from "@/features/races/gear-weather";
import { GearAlongRace } from "@/features/races/components/gear-along-race";
import type { RaceWeather } from "@/features/races/weather";
import type { RacePlanModel } from "@/features/races/workspace";
import type { NutritionProduct } from "@/features/fueling/products";

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
      className="flex flex-col gap-2.5 border-b border-border pb-4.5 print:border-0"
    >
      <h2
        id="gear-readiness"
        className="text-label font-medium text-muted-foreground"
      >
        Où tu en es
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
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {[
          {
            label: "Prêt",
            value: readiness.ready,
            detail: `sur ${readiness.total}`,
          },
          { label: "À vérifier", value: readiness.check, detail: null },
          { label: "À acheter", value: readiness.buy, detail: null },
          {
            label: "À faire",
            value: readiness.todo + readiness.test,
            detail: null,
          },
        ].map((item) => (
          <div key={item.label} className="flex items-baseline gap-2">
            <dt className="text-secondary-foreground">{item.label}</dt>
            <dd className="font-semibold tabular-nums">
              {item.value}
              {item.detail && (
                <span className="ml-1 font-normal text-muted-foreground">
                  {item.detail}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
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

type Planned = NonNullable<ReturnType<typeof planFor>> & {
  planned: RacePlanModel;
};

function gearOf(
  data: RaceWorkspaceData,
  views: Planned,
  weather: RaceWeather | null,
  products: { active: NutritionProduct[]; archived: NutritionProduct[] },
) {
  const { model, planned } = views;
  const distanceM = model.course.distanceM;
  const items = weatherGear({ weather, planned, distanceM });
  const timeline = timelineFor({ data, model, planned, weather, products });
  const stations = timeline.stations.map((station) => ({
    id: station.id,
    name: station.name,
    kind: station.kind,
    clock: formatClock(station.clockMinutes),
    distanceM: station.distanceM,
  }));
  return { items, stations, distanceM };
}

async function GearReading({
  data,
  views,
  weather,
  products,
}: {
  data: RaceWorkspaceData;
  views: Planned;
  weather: Promise<RaceWeather | null>;
  products: { active: NutritionProduct[]; archived: NutritionProduct[] };
}) {
  const { items, stations } = gearOf(data, views, await weather, products);
  const reading = gearReading(items, stations);
  return reading ? (
    <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
      <StrideMark className="mt-1 size-3.5 shrink-0" />
      {reading}
    </p>
  ) : null;
}

async function GearWithWeather({
  data,
  views,
  weather: weatherRead,
  products,
}: {
  data: RaceWorkspaceData;
  views: Planned;
  weather: Promise<RaceWeather | null>;
  products: { active: NutritionProduct[]; archived: NutritionProduct[] };
}) {
  const weather = await weatherRead;
  const { items, stations, distanceM } = gearOf(data, views, weather, products);
  const mandatory = data.checklist
    .filter((item) => item.list === "gear_mandatory")
    .map((item) => item.label);
  return (
    <GearAlongRace
      rows={gearTimeline({ items, distanceM, stations, mandatory })}
      distanceM={distanceM}
      stations={stations}
      temperatures={(weather?.slots ?? []).map((slot) => ({
        distanceM: slot.distanceM,
        label: `${Math.round(slot.temperature)}°`,
      }))}
      night={views.planned.nightKm}
      rain={items.find((item) => item.key === "jacket")?.ranges ?? []}
      normals={weather?.mode === "normals"}
    />
  );
}

async function WeatherDecisions({
  views,
  weather,
}: {
  views: Planned;
  weather: Promise<RaceWeather | null>;
}) {
  const items = weatherGear({
    weather: await weather,
    planned: views.planned,
    distanceM: views.model.course.distanceM,
  });
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="gear-weather-decisions"
      className="flex flex-col gap-2"
    >
      <h2
        id="gear-weather-decisions"
        className="text-label font-medium text-muted-foreground"
      >
        Décidé par la météo
      </h2>
      <dl className="flex flex-col">
        {items.map((item) => (
          <div
            key={item.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-border py-1.5"
          >
            <dt className="font-medium">{item.label}</dt>
            <dd className="text-right tabular-nums">{item.where}</dd>
            <dd className="col-span-2 text-label text-muted-foreground">
              {item.reason}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Forbidden({
  poles,
  items,
}: {
  poles: string | null;
  items: ChecklistItem[];
}) {
  const labels = [
    ...(poles === "forbidden" ? ["Bâtons"] : []),
    ...items
      .filter((item) => item.list === "gear_forbidden")
      .map((item) => item.label),
  ];
  return (
    <section aria-labelledby="gear-forbidden" className="flex flex-col gap-1.5">
      {labels.length > 0 && (
        <>
          <h2
            id="gear-forbidden"
            className="text-label font-medium text-muted-foreground"
          >
            Interdit sur cette course
          </h2>
          <p className="font-medium">{labels.join(", ")}</p>
        </>
      )}
      <p className="text-label text-pretty text-muted-foreground">
        La liste part du règlement de la course. Vérifie-le : il fait foi.
      </p>
    </section>
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
        <div className="xl:sticky xl:top-0 xl:col-start-2 xl:row-start-1 xl:border-l xl:border-border xl:pl-5">
          <Readiness items={data.checklist} lists={prepLists} />
        </div>
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
  const planned: Planned | null = views?.planned
    ? { ...views, planned: views.planned }
    : null;
  const weather =
    planned && data.race.date
      ? weatherFor(data, planned.model, planned.planned)
      : null;
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
      <div className="flex flex-col gap-4.5 max-xl:order-last xl:sticky xl:top-0 xl:col-start-2 xl:row-span-4 xl:row-start-1 xl:border-l xl:border-border xl:pl-5">
        <Readiness items={data.checklist} lists={trailChecklistLists} />
        {planned && weather && (
          <Suspense fallback={null}>
            <WeatherDecisions views={planned} weather={weather} />
          </Suspense>
        )}
        <Forbidden poles={data.details.poles ?? null} items={data.checklist} />
      </div>
      {planned && weather && (
        <div className="flex flex-col gap-4.5 xl:col-start-1 xl:row-start-1 print:hidden">
          <Suspense fallback={null}>
            <GearReading
              data={data}
              views={planned}
              weather={weather}
              products={library}
            />
          </Suspense>
          <Suspense fallback={null}>
            <GearWithWeather
              data={data}
              views={planned}
              weather={weather}
              products={library}
            />
          </Suspense>
        </div>
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
