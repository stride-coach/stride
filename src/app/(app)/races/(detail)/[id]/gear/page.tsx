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
import { StatusPill } from "@/features/races/components/race-ui";
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
import { planFor } from "@/server/races/views";

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
      aria-label="Préparation"
      className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4"
    >
      <div className="flex items-baseline gap-2.5 md:items-center md:gap-4">
        <span className="font-metric text-[2.125rem] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap tabular-nums md:text-[2.5rem]">
          {readiness.ready} / {readiness.total}
        </span>
        <span className="text-meta text-secondary-foreground md:text-sm">
          <span className="md:hidden">
            {readinessDetail(readiness, { short: true })}
          </span>
          <span className="max-md:hidden">{readinessDetail(readiness)}</span>
        </span>
      </div>
      <Progress
        value={percent}
        aria-label={`${readiness.ready} éléments prêts sur ${readiness.total}`}
        className="h-1.5 bg-border md:max-w-105 md:flex-1"
      />
      <PrintSheetButton
        label="Imprimer la check-list"
        icon={false}
        size="md"
        className="ml-auto max-md:hidden"
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
      <p className="pb-2 text-meta text-secondary-foreground">
        Aucune paire choisie pour cette course. Lie une paire à une ligne
        ci-dessous ou réserve-la dans Matériel.
      </p>
    );
  return (
    <div className="flex flex-col gap-2.5 pb-2">
      <div className="flex items-center gap-3 rounded-xl border border-primary/25 p-2.5 md:gap-3.5 md:p-3">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-muted max-md:hidden"
        >
          <NavGearIcon className="size-5.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={`/gear/${pair.id}`}
            className="self-start text-[15px] font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            {pair.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {pair.facts}
            <span className="max-md:hidden"> · {pair.terrain}</span>
          </span>
        </span>
        <StatusPill
          tone="outline"
          className="border-success/35 text-[11px] text-success md:text-xs"
        >
          {pair.badge}
        </StatusPill>
      </div>
      <p className="text-meta text-secondary-foreground max-md:hidden">
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
      <>
        <Readiness items={data.checklist} lists={prepLists} />
        <div className="grid items-start gap-5 md:grid-cols-3 md:gap-6 print:grid-cols-3">
          {prepLists.map((list) => group(list))}
        </div>
      </>
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
        plan: data.plan,
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
    <>
      <Readiness items={data.checklist} lists={trailChecklistLists} />
      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6 print:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          {group("gear_kit", {
            pairs,
            lead: <PairLead pair={pair} />,
            aside: (
              <Link
                href="/gear"
                className="text-meta text-primary underline underline-offset-2 hover:text-foreground max-md:hidden print:hidden"
              >
                Matériel →
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
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
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
    </>
  );
}
