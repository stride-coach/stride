import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Widget } from "@/components/stride/widget";
import { cn } from "@/lib/utils";
import {
  AddProductButton,
  EditProductButton,
} from "@/features/fueling/components/product-dialog";
import type { NutritionProduct } from "@/features/fueling/products";
import type { RaceNutritionPlan } from "@/features/fueling/race-plan";
import { sessionPanelHref } from "@/features/plans/view/session-href";
import { formatClock, formatDuration, formatInteger } from "../format";
import {
  dropBagNote,
  formatShortDate,
  nutritionTiles,
  productRows,
  segmentRows,
  shoppingRows,
  startBoxes,
  testedRows,
  type UpcomingSession,
  fuelingHours,
} from "../nutrition-view";
import type { ChecklistItem } from "../checklists";
import type { RacePlan } from "../race";
import { raceAllocation } from "../race-nutrition";
import type { RaceStrategy } from "../proposals";
import { raceTimeline, timelineFueling } from "../timeline";
import type { RaceWeather } from "../weather";
import type { CourseModel, RacePlanModel } from "../workspace";
import { FuelingHours } from "./fueling-hours";
import { NutritionTargetTile } from "./nutrition-target-tile";
import { NutritionistBanner } from "./nutritionist-banner";

const updatedFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

const headClass =
  "px-2 py-2 tabular-nums text-label font-normal text-muted-foreground ";

const panelHeading = "text-label font-medium text-muted-foreground";

export type NutritionBodyProps = {
  data: {
    race: { id: string };
    plan: RacePlan;
    checklist: ChecklistItem[];
    strategy: RaceStrategy | null;
    nutritionPlan: { plan: RaceNutritionPlan; updatedAt: string } | null;
    dropBag: { extras: string[] } | null;
  };
  model: CourseModel;
  planned: RacePlanModel;
  products: NutritionProduct[];
  archivedProducts: NutritionProduct[];
  sessions: UpcomingSession[];
  proposal: { id: string; changes: number } | null;
};

function SegmentBadge({ index }: { index: number }) {
  return (
    <span className="inline-flex h-5 min-w-7 items-center justify-center rounded-sm border border-control-border text-label font-medium tabular-nums">
      T{index}
    </span>
  );
}

function ShoppingList({
  rows,
  note,
  id,
}: {
  rows: ReturnType<typeof shoppingRows>;
  note: string | null;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className={panelHeading}>
        Liste de courses
      </h2>
      <dl>
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex min-h-row items-center justify-between gap-3 border-t border-border"
          >
            <dt>{row.name}</dt>
            <dd data-slot="metric" className="font-semibold tabular-nums">
              {row.count}
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="text-label text-muted-foreground">{note}</p>}
    </section>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="mt-1 size-3 shrink-0 text-primary"
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
    <Widget
      headingLevel={2}
      title={<span id="mes-produits">Mes produits</span>}
      verdict={<AddProductButton added={added} />}
      aria-labelledby="mes-produits"
    >
      {rows.length === 0 ? (
        <p className="text-body text-secondary-foreground">
          Ajoute tes gels, boissons et barres : Stride calcule alors les
          quantités exactes de chaque tronçon.
        </p>
      ) : (
        <>
          <table className="w-full table-fixed border-collapse text-left text-body max-md:hidden">
            <thead>
              <tr className="border-b border-border">
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
                <tr
                  key={row.product.id}
                  className="border-b border-border last:border-b-0"
                >
                  <th scope="row" className="px-2 py-2.5 align-top">
                    <EditProductButton product={row.product} />
                  </th>
                  <td className="px-2 py-2.5 align-top text-secondary-foreground">
                    {row.kind}
                  </td>
                  {[row.carbs, row.sodium, row.caffeine].map((value, index) => (
                    <td
                      key={index}
                      data-slot="metric"
                      className="px-2 py-2.5 align-top font-semibold tabular-nums"
                    >
                      {value}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 align-top text-secondary-foreground">
                    {row.serving}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 align-top",
                      row.product.tested ? "text-primary" : "text-warning",
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
                className="flex flex-col items-start gap-0.5 border-b border-border py-2 last:border-b-0"
              >
                <EditProductButton
                  product={row.product}
                  className="text-body"
                />
                <span className="text-label text-muted-foreground">
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
                      row.product.tested ? "text-primary" : "text-warning"
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
      <p className="pt-2 text-label text-muted-foreground max-md:hidden">
        Catalogue des marques courantes (Maurten, Näak, Overstims, Precision
        Fuel…) ou saisie libre.
      </p>
    </Widget>
  );
}

export function NutritionBody({
  data,
  model,
  planned,
  products,
  archivedProducts,
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
    dropBagExtras: data.dropBag?.extras ?? [],
    products,
    archivedProducts,
    weather,
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
  const bagNote = dropBagNote(
    allocation,
    new Map(timeline.stations.map((station) => [station.id, station.name])),
  );
  const rows = segmentRows(allocation, timeline);
  const tile = { raceId, revision: plan.revision };
  return (
    <div className="flex flex-col gap-5 md:gap-6 xl:flex-row xl:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-5 md:gap-6">
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
          className="grid grid-cols-2 gap-x-4 gap-y-1 border-y border-border py-2 sm:grid-cols-3 lg:grid-cols-5"
        >
          <NutritionTargetTile
            key={`carbs-${plan.revision}`}
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
            key={`water-${plan.revision}`}
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
            key={`sodium-${plan.revision}`}
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
            key={`caffeine-${plan.revision}`}
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
            key={`alarm-${plan.revision}`}
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
        <section
          aria-label="Base commune"
          className="flex flex-col gap-1 text-body text-secondary-foreground sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3"
        >
          <span className="font-medium text-foreground">Base commune</span>
          <p className="sm:min-w-65 sm:flex-1">
            Ces chiffres sont aussi ta base d’entraînement : chaque séance de 1
            h 30 ou plus suit {formatInteger(plan.carbsPerHourG)} g/h,{" "}
            {formatInteger(plan.sodiumMgPerHour)} mg/h de sodium et{" "}
            {formatInteger(plan.waterMlPerHour)} ml/h d’eau.
          </p>
          <Link
            href="/health/nutrition"
            className="inline-flex min-h-control-touch items-center text-primary hover:text-foreground md:min-h-0"
          >
            Nutrition du jour
          </Link>
        </section>
        <Widget
          headingLevel={2}
          title={<span id="heure-par-heure">Heure par heure</span>}
          verdict={
            <span className="text-label font-normal text-muted-foreground">
              calé sur tes heures de passage
            </span>
          }
          aria-labelledby="heure-par-heure"
        >
          <FuelingHours
            hours={fuelingHours(allocation, timeline)}
            targetPerHourG={plan.carbsPerHourG}
          />
        </Widget>
        <Widget
          headingLevel={2}
          title={<span id="section-par-section">Section par section</span>}
          verdict={
            <span className="text-label font-normal text-muted-foreground">
              ce que tu portes, ce que tu fais au ravito
            </span>
          }
          aria-labelledby="section-par-section"
        >
          <ol className="flex flex-col">
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid gap-x-6 gap-y-2 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <SegmentBadge index={row.index} />
                    <span className="min-w-0 font-medium">{row.route}</span>
                    <span
                      data-slot="metric"
                      className="ml-auto font-semibold tabular-nums md:hidden"
                    >
                      {row.carbs}
                    </span>
                  </div>
                  <span className="text-label text-muted-foreground">
                    {row.timing}
                  </span>
                  <span className="flex gap-3 text-label text-secondary-foreground tabular-nums">
                    <span className="font-semibold text-foreground max-md:hidden">
                      {row.carbs}
                    </span>
                    <span>Eau {row.water}</span>
                    <span>Sodium {row.sodium}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-label font-medium text-muted-foreground">
                    Dans tes poches
                  </h3>
                  <p className="text-pretty">{row.eat}</p>
                </div>
                {row.station && (
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-label font-medium text-muted-foreground">
                      Au ravito de {row.station}
                      {row.stop ? ` · ${row.stop}` : ""}
                    </h3>
                    <p className="text-pretty text-secondary-foreground">
                      {row.arrival}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Widget>
        <div className="grid min-w-0 items-start gap-3 lg:grid-cols-2">
          <Widget
            headingLevel={2}
            title={
              <span id="au-depart">
                Au départ
                <span className="sm:hidden"> · {formatClock(startClock)}</span>
              </span>
            }
            verdict={
              <span className="text-label font-normal text-muted-foreground tabular-nums max-sm:hidden">
                {formatClock(startClock)} · {start?.name}
              </span>
            }
            aria-labelledby="au-depart"
          >
            <dl className="flex flex-col">
              {boxes.map((box) => (
                <div
                  key={box.label}
                  className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5 border-b border-border py-2 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <dt className="text-secondary-foreground">
                    <span className="max-sm:hidden">{box.label}</span>
                    <span className="sm:hidden">
                      {box.label
                        .split(" · ")[0]
                        .replace("Poches avant", "Poches")}
                    </span>
                  </dt>
                  <dd className="font-medium">{box.value}</dd>
                  <dd className="col-start-2 text-label text-muted-foreground max-sm:hidden">
                    {box.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </Widget>
          <Widget
            headingLevel={2}
            title={<span id="teste-ravito">Teste ton ravito</span>}
            verdict={
              <span className="text-label font-normal text-muted-foreground max-sm:hidden">
                Sorties de 1 h 30 ou plus avant la course
              </span>
            }
            aria-labelledby="teste-ravito"
          >
            <div className="flex flex-col gap-2">
              {sessions.length ? (
                <ul aria-label="Sorties pour tester ton ravito">
                  {sessions.map((session) => (
                    <li
                      key={session.sessionKey}
                      className="flex items-start gap-2.5 border-b border-border py-2 first:pt-0"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-3 shrink-0 rounded-full border border-muted-foreground"
                      />
                      <span className="flex flex-1 flex-col gap-0.5">
                        <Link
                          href={sessionPanelHref(session.sessionKey)}
                          className="font-medium hover:text-primary"
                        >
                          {formatShortDate(session.date)} · {session.title} ·{" "}
                          {formatDuration(session.durationSeconds)}
                        </Link>
                        <span className="text-label text-muted-foreground">
                          {formatInteger(session.carbsG.max)} g à{" "}
                          {formatInteger(plan.carbsPerHourG)} g/h
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-label font-medium text-warning">
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-current"
                        />
                        À faire
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-secondary-foreground">
                  Aucune sortie de 1 h 30 ou plus prévue d’ici la course.
                </p>
              )}
              {tested.length ? (
                <>
                  <h3 className="pt-1 text-label font-medium text-muted-foreground">
                    Déjà validé
                  </h3>
                  <ul>
                    {tested.map((row, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2.5 border-b border-border py-2 last:border-b-0"
                      >
                        {row.done ? (
                          <CheckMark />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 size-3 shrink-0 rounded-full border border-warning"
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
                </>
              ) : (
                <p className="text-label text-muted-foreground">
                  Coche « Testé à l’entraînement » dans Mes produits après ta
                  prochaine sortie longue.
                </p>
              )}
              {sessions.length > 0 && (
                <Link
                  href="/plan"
                  className="inline-flex min-h-control-touch items-center text-primary hover:text-foreground md:min-h-0"
                >
                  Voir ces séances dans le plan
                </Link>
              )}
            </div>
          </Widget>
        </div>
        <div className="flex flex-col gap-3 xl:hidden">
          <ShoppingList
            id="liste-courses-mobile"
            rows={shopping}
            note={bagNote}
          />
          <p className="text-label text-muted-foreground">
            Repères d’entraînement, pas un avis médical. Adapte si quelque chose
            ne passe pas en sortie longue.
          </p>
        </div>
      </div>
      <aside
        aria-label="Contexte de l’alimentation"
        className="flex flex-col gap-4 max-xl:hidden xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border xl:pl-5"
      >
        <ShoppingList id="liste-courses" rows={shopping} note={bagNote} />
        <p className="border-t border-border pt-3 text-label text-muted-foreground">
          Repères d’entraînement, pas un avis médical. Adapte si quelque chose
          ne passe pas en sortie longue.
        </p>
      </aside>
    </div>
  );
}
