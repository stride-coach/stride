import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { MonoLabel } from "@/components/stride/mono-label";
import { cn } from "@/lib/utils";
import {
  AddProductButton,
  EditProductButton,
} from "@/features/fueling/components/product-dialog";
import type { NutritionProduct } from "@/features/fueling/products";
import type { RaceNutritionPlan } from "@/features/fueling/race-plan";
import { formatClock } from "../format";
import {
  dropBagNote,
  nutritionTiles,
  productRows,
  segmentRows,
  shoppingRows,
  startBoxes,
  testedRows,
  type UpcomingSession,
} from "../nutrition-view";
import type { ChecklistItem } from "../checklists";
import type { RacePlan } from "../race";
import { raceAllocation } from "../race-nutrition";
import type { RaceStrategy } from "../proposals";
import { raceTimeline, timelineFueling } from "../timeline";
import type { RaceWeather } from "../weather";
import type { CourseModel, RacePlanModel } from "../workspace";
import { NutritionTargetTile } from "./nutrition-target-tile";
import { NutritionistBanner } from "./nutritionist-banner";
import { RaceCard } from "./race-ui";

const updatedFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

const headClass =
  "px-2 py-2.5 font-mono text-micro font-normal tracking-[0.08em] text-muted-foreground uppercase";

export type NutritionBodyProps = {
  data: {
    race: { id: string };
    plan: RacePlan;
    checklist: ChecklistItem[];
    strategy: RaceStrategy | null;
    nutritionPlan: { plan: RaceNutritionPlan; updatedAt: string } | null;
  };
  model: CourseModel;
  planned: RacePlanModel;
  products: NutritionProduct[];
  sessions: UpcomingSession[];
  proposal: { id: string; changes: number } | null;
};

function SegmentBadge({ index }: { index: number }) {
  return (
    <span className="inline-flex h-5.5 min-w-7 items-center justify-center rounded-control border border-border-strong bg-surface-raised font-metric text-xs font-semibold">
      T{index}
    </span>
  );
}

function ShoppingCard({
  rows,
  note,
}: {
  rows: ReturnType<typeof shoppingRows>;
  note: string | null;
}) {
  return (
    <RaceCard
      aria-labelledby="liste-courses"
      className="gap-1.5 max-sm:p-4 sm:gap-2"
    >
      <h2 id="liste-courses" className="text-base font-semibold">
        Liste de courses
      </h2>
      <dl>
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex justify-between gap-3 border-t border-border py-2 text-meta sm:text-sm"
          >
            <dt>{row.name}</dt>
            <dd className="font-metric text-base font-semibold tabular-nums">
              {row.count}
            </dd>
          </div>
        ))}
      </dl>
      {note && (
        <span className="text-xs text-muted-foreground max-lg:hidden">
          {note}
        </span>
      )}
    </RaceCard>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="mt-1 size-3 shrink-0 text-success"
    >
      <path
        d="M2 6 L5 9 L10 3"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function ProductsCard({
  products,
  sessions,
}: {
  products: NutritionProduct[];
  sessions: UpcomingSession[];
}) {
  const rows = productRows(products, sessions);
  const added = products.flatMap((product) =>
    product.catalogueKey ? [product.catalogueKey] : [],
  );
  return (
    <RaceCard aria-labelledby="mes-produits" className="gap-1.5 max-sm:p-4">
      <div className="flex items-center gap-3">
        <h2 id="mes-produits" className="text-base font-semibold sm:text-lg">
          Mes produits
        </h2>
        <AddProductButton added={added} className="ml-auto max-sm:min-h-9" />
      </div>
      {rows.length === 0 ? (
        <p className="border-t border-border py-3 text-meta text-muted">
          Ajoute tes gels, boissons et barres : Stride calcule alors les
          quantités exactes de chaque tronçon.
        </p>
      ) : (
        <>
          <table className="w-full table-fixed border-collapse text-left text-meta max-md:hidden">
            <thead>
              <tr className="border-b border-border-strong">
                {[
                  "Produit",
                  "Type",
                  "Glucides",
                  "Sodium",
                  "Caféine",
                  "Portion",
                  "Testé",
                ].map((label) => (
                  <th key={label} scope="col" className={headClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.product.id} className="border-b border-border">
                  <th scope="row" className="px-2 py-3 align-top">
                    <EditProductButton product={row.product} />
                  </th>
                  <td className="px-2 py-3 align-top text-muted">{row.kind}</td>
                  {[row.carbs, row.sodium, row.caffeine].map((value, index) => (
                    <td
                      key={index}
                      className="px-2 py-3 align-top font-metric text-[0.9375rem] font-semibold tabular-nums"
                    >
                      {value}
                    </td>
                  ))}
                  <td className="px-2 py-3 align-top text-muted">
                    {row.serving}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-3 align-top",
                      row.product.tested ? "text-success" : "text-warning",
                    )}
                  >
                    {row.tested}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="flex flex-col md:hidden">
            {rows.map((row) => (
              <li
                key={row.product.id}
                className="flex flex-col items-start gap-0.5 border-t border-border py-2.25"
              >
                <EditProductButton product={row.product} className="text-sm" />
                <span className="text-xs text-muted-foreground">
                  {[
                    row.shortKind,
                    `${row.carbs} glucides`,
                    row.product.sodiumMg > 0 && `${row.sodium} sodium`,
                    row.product.caffeineMg > 0 && `${row.caffeine} caféine`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {" · "}
                  <span
                    className={
                      row.product.tested ? "text-success" : "text-warning"
                    }
                  >
                    {row.product.tested ? "✓ testé" : "à tester"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="text-xs text-muted-foreground max-md:hidden">
        Catalogue des marques courantes (Maurten, Näak, Overstims, Precision
        Fuel…) ou saisie libre.
      </span>
    </RaceCard>
  );
}

export function NutritionBody({
  data,
  model,
  planned,
  products,
  sessions,
  proposal,
  weather,
}: NutritionBodyProps & { weather: RaceWeather | null }) {
  const { plan } = data;
  const raceId = data.race.id;
  const allocation = raceAllocation({
    model,
    planned,
    plan,
    nutritionPlan: data.nutritionPlan?.plan ?? null,
    products,
  });
  const timeline = raceTimeline({
    model,
    planned,
    weather,
    strategy: data.strategy,
    fueling: timelineFueling(allocation),
    stops: plan,
    walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
  });
  const start = timeline.stations[0];
  const startClock = start?.clockMinutes ?? 0;
  const tiles = nutritionTiles({
    allocation,
    plan,
    weather,
    startClockMinutes: startClock,
  });
  const boxes = startBoxes({
    allocation,
    plan,
    startTemperature: start?.weather?.temperature ?? null,
  });
  const tested = testedRows({
    products,
    allocation,
    checklist: data.checklist,
    sessions,
  });
  const shopping = shoppingRows(allocation);
  const bagNote = dropBagNote(allocation);
  const rows = segmentRows(allocation, timeline);
  const tile = { raceId, revision: plan.revision };
  return (
    <>
      <NutritionistBanner
        raceId={raceId}
        proposal={proposal}
        accepted={data.nutritionPlan !== null}
        generic={allocation.generic}
        productCount={products.length}
        carbsPerHourG={plan.carbsPerHourG}
        weather={weather?.mode ?? null}
        updatedOn={
          data.nutritionPlan
            ? updatedFormat.format(new Date(data.nutritionPlan.updatedAt))
            : null
        }
      />
      <section
        aria-label="Cibles nutrition"
        className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5"
      >
        <NutritionTargetTile
          {...tile}
          label="Glucides"
          value={tiles.carbs.value}
          detail={tiles.carbs.detail}
          mobileDetail={tiles.carbs.mobile}
          title="Glucides par heure"
          fields={[
            {
              key: "carbsPerHourG",
              label: "Glucides (g/h)",
              value: plan.carbsPerHourG,
              min: 20,
              max: 120,
            },
          ]}
        />
        <NutritionTargetTile
          {...tile}
          label="Eau"
          value={tiles.water.value}
          detail={tiles.water.detail}
          mobileDetail={tiles.water.mobile}
          title="Eau et contenants"
          fields={[
            {
              key: "waterMlPerHour",
              label: "Eau (ml/h)",
              value: plan.waterMlPerHour,
              min: 100,
              max: 1500,
            },
            {
              key: "flaskCount",
              label: "Flasques",
              value: plan.flaskCount,
              min: 0,
              max: 6,
            },
            {
              key: "flaskMl",
              label: "Volume (ml)",
              value: plan.flaskMl,
              min: 100,
              max: 1500,
            },
            {
              key: "bladderMl",
              label: "Poche à eau (ml)",
              value: plan.bladderMl,
              min: 250,
              max: 3000,
              optional: true,
            },
          ]}
        />
        <NutritionTargetTile
          {...tile}
          label="Sodium"
          value={tiles.sodium.value}
          detail={tiles.sodium.detail}
          title="Sodium par heure"
          fields={[
            {
              key: "sodiumMgPerHour",
              label: "Sodium (mg/h)",
              value: plan.sodiumMgPerHour,
              min: 0,
              max: 2000,
            },
          ]}
        />
        <NutritionTargetTile
          {...tile}
          label="Caféine"
          value={tiles.caffeine.value}
          detail={tiles.caffeine.detail}
          mobileDetail={tiles.caffeine.mobile}
          title="Caféine sur la course"
          fields={[
            {
              key: "caffeineMaxMg",
              label: "Maximum (mg)",
              value: plan.caffeineMaxMg,
              min: 0,
              max: 600,
            },
          ]}
          nightCaffeine={plan.nightCaffeine}
        />
        <NutritionTargetTile
          {...tile}
          label="Alarme"
          value={tiles.alarm.value}
          detail={tiles.alarm.detail}
          title="Alarme de la montre"
          className="max-lg:hidden"
          fields={[
            {
              key: "alarmMinutes",
              label: "Toutes les (min)",
              value: plan.alarmMinutes,
              min: 5,
              max: 60,
            },
          ]}
        />
      </section>
      <div className="grid min-w-0 items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
          <RaceCard
            aria-labelledby="au-depart"
            className="gap-2 max-sm:p-4 sm:gap-3"
          >
            <div className="flex items-baseline gap-3">
              <h2 id="au-depart" className="text-base font-semibold sm:text-lg">
                Au départ
                <span className="sm:hidden"> · {formatClock(startClock)}</span>
              </h2>
              <span className="ml-auto text-meta text-muted-foreground max-sm:hidden">
                {formatClock(startClock)} · {start?.name}
              </span>
            </div>
            <div className="grid gap-3 max-sm:hidden sm:grid-cols-3">
              {boxes.map((box) => (
                <div
                  key={box.label}
                  className="flex min-w-0 flex-col gap-1.5 rounded-card border border-border p-3.5"
                >
                  <MonoLabel size="micro">{box.label}</MonoLabel>
                  <span className="text-body font-semibold">{box.value}</span>
                  <span className="text-xs text-muted-foreground">
                    {box.detail}
                  </span>
                </div>
              ))}
            </div>
            <dl className="flex flex-col sm:hidden">
              {boxes.map((box) => (
                <div
                  key={box.label}
                  className="flex items-center justify-between gap-2.5 border-t border-border py-2 text-meta"
                >
                  <dt>
                    <MonoLabel size="nano">
                      {box.label
                        .split(" · ")[0]
                        .replace("Poches avant", "Poches")}
                    </MonoLabel>
                  </dt>
                  <dd className="text-right">{box.value}</dd>
                </div>
              ))}
            </dl>
          </RaceCard>
          <RaceCard
            aria-labelledby="teste-entrainement"
            className="gap-2 max-sm:hidden"
          >
            <h2 id="teste-entrainement" className="text-base font-semibold">
              Testé à l’entraînement
            </h2>
            {tested.length ? (
              <ul>
                {tested.map((row, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 border-t border-border py-2 text-meta"
                  >
                    {row.done ? (
                      <CheckMark />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="mt-1 size-2.5 shrink-0 rounded-full bg-warning"
                      />
                    )}
                    <span className="flex-1">
                      <span className="sr-only">
                        {row.done ? "Testé : " : "À tester : "}
                      </span>
                      {row.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-border pt-2 text-meta text-muted">
                Aucun produit testé pour l’instant : coche « Testé à
                l’entraînement » dans Mes produits après ta prochaine sortie
                longue.
              </p>
            )}
            {sessions.length > 0 && (
              <Link
                href="/plan"
                className="text-meta text-accent hover:text-foreground"
              >
                Voir ces séances dans le plan →
              </Link>
            )}
          </RaceCard>
        </div>
        <aside
          aria-label="Liste de courses"
          className="flex flex-col gap-6 max-lg:hidden"
        >
          <ShoppingCard rows={shopping} note={bagNote} />
        </aside>
      </div>
      <section
        aria-labelledby="plan-par-troncon"
        className="flex min-w-0 flex-col gap-2 md:gap-1.5 md:rounded-panel md:border md:border-border md:bg-surface md:px-6 md:py-5.5"
      >
        <h2
          id="plan-par-troncon"
          className="text-base font-semibold md:text-lg"
        >
          Plan par tronçon
        </h2>
        <table className="w-full table-fixed border-collapse text-left text-meta max-md:hidden">
          <colgroup>
            <col className="w-12" />
            <col className="w-[22%]" />
            <col className="w-20" />
            <col className="w-[30%]" />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-border-strong">
              <th scope="col" className={headClass}>
                <span className="sr-only">Numéro</span>
              </th>
              <th scope="col" className={headClass}>
                Tronçon
              </th>
              <th scope="col" className={headClass}>
                Glucides
              </th>
              <th scope="col" className={headClass}>
                À prendre pendant
              </th>
              <th scope="col" className={headClass}>
                Au ravito d’arrivée
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border align-top">
                <td className="px-2 py-3">
                  <SegmentBadge index={row.index} />
                </td>
                <th scope="row" className="px-2 py-3 font-normal">
                  <span className="font-medium">{row.route}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {row.timing}
                  </span>
                </th>
                <td className="px-2 py-3 font-metric text-[1.0625rem] font-semibold tabular-nums">
                  {row.carbs}
                </td>
                <td className="px-2 py-3">{row.eat}</td>
                <td className="px-2 py-3 text-muted">{row.arrival}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ol className="flex flex-col gap-2 md:hidden">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-1.5 rounded-panel border border-border bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                <SegmentBadge index={row.index} />
                <span className="text-meta font-medium">{row.route}</span>
                <span className="ml-auto font-metric text-base font-semibold tabular-nums">
                  {row.carbs}
                </span>
              </div>
              <span className="text-meta">{row.eat}</span>
              <span className="text-xs text-muted-foreground">
                Au ravito : {row.arrival}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className="lg:hidden">
        <ShoppingCard rows={shopping} note={bagNote} />
      </div>
    </>
  );
}
