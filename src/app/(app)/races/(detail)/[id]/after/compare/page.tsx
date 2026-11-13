import { redirect } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/features/races/components/race-ui";
import {
  compareEditions,
  editionChanges,
  editionConditions,
} from "@/features/races/editions";
import { isStation } from "@/features/races/waypoints";
import { loadEditions } from "@/server/races/editions";
import { loadRace } from "@/server/races/load";

const head =
  "px-2 py-2 text-right text-label font-normal text-muted-foreground";
const cell = "px-2 py-2.5 text-right tabular-nums whitespace-nowrap";

export default async function RaceComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ with?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { context, data, today } = await loadRace(id);
  const base = `/races/${data.race.id}`;
  const raceDate = data.race.date;
  if (!raceDate || raceDate >= today) redirect(base);
  const start = data.course?.points[0] ?? null;
  const { editions, chosen, current, previous, settings, days } =
    await loadEditions(
      context,
      { ...data.race, date: raceDate },
      today,
      typeof query.with === "string" ? query.with : null,
      start ? { lat: start[0], lon: start[1] } : null,
    );
  if (!chosen)
    return (
      <>
        <EmptyState title="Aucune autre édition à comparer">
          Stride compare les courses passées du même nom, du même type et de
          distance proche. Ajoute l’édition précédente dans Courses pour la
          retrouver ici.
        </EmptyState>
      </>
    );
  const year = raceDate.slice(0, 4);
  const picker = editions.length > 1 && (
    <nav
      aria-label="Édition comparée"
      className="flex w-fit flex-wrap gap-0.5 rounded-lg border border-border bg-card p-0.5"
    >
      {editions.map((edition) => (
        <Link
          key={edition.id}
          href={`${base}/after/compare?with=${edition.id}`}
          aria-current={edition.id === chosen.id ? "page" : undefined}
          scroll={false}
          className={cn(
            "inline-flex min-h-control-touch items-center rounded-md px-3 text-muted-foreground tabular-nums hover:text-foreground md:min-h-7",
            edition.id === chosen.id && "bg-muted font-medium text-foreground",
          )}
        >
          {edition.date.slice(0, 4)}
        </Link>
      ))}
    </nav>
  );
  if (!current || !previous)
    return (
      <>
        {picker}
        <EmptyState title="Résultat non trouvé">
          {!current
            ? `Stride ne trouve pas ta sortie de course ${year}.`
            : `Stride ne trouve pas ta sortie de course ${chosen.date.slice(0, 4)}.`}{" "}
          Il cherche une course enregistrée le jour même, à 15 % près de la
          distance.
        </EmptyState>
      </>
    );
  const comparison = compareEditions({
    current: { ...current, year },
    previous,
    stations: data.waypoints
      .filter((waypoint) => isStation(waypoint.kind))
      .map((waypoint) => ({
        name: waypoint.name,
        distanceM: waypoint.distanceM,
      })),
  });
  const changes = settings
    ? editionChanges({
        current: { ...current, year },
        previous,
        startM: comparison.startM,
        settings,
      })
    : [];
  const conditions = editionConditions(days);
  const maxGap = Math.max(
    1,
    ...comparison.sections.map((section) =>
      Math.abs(section.deltaSeconds ?? 0),
    ),
  );
  const tone = (seconds: number | null) =>
    seconds === null
      ? "text-muted-foreground"
      : seconds > 0
        ? "text-warning"
        : "text-primary";
  const bar = (seconds: number | null) =>
    seconds === null ? null : (
      <span className="relative block h-1.5 rounded-full bg-muted">
        <span
          className={cn(
            "absolute inset-y-0 rounded-full",
            seconds > 0 ? "left-1/2 bg-warning" : "right-1/2 bg-primary",
          )}
          style={{ width: `${(Math.abs(seconds) / maxGap) * 50}%` }}
        />
      </span>
    );
  return (
    <>
      {picker}
      <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
        <StrideMark className="mt-1 size-3.5 shrink-0" />
        {comparison.reading}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3.5 sm:grid-cols-4">
        {comparison.kpis.map((kpi) => (
          <div key={kpi.key} className="flex flex-col-reverse gap-0.5">
            <dt className="text-label text-secondary-foreground">
              {kpi.label}
            </dt>
            <dd
              data-slot="metric"
              className={cn(
                "text-title font-semibold tabular-nums",
                kpi.key === "gap" && tone(current.seconds - previous.seconds),
              )}
            >
              {kpi.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <section
          aria-labelledby="compare-sections"
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="compare-sections" className="font-semibold">
              Section par section
            </h2>
            <p className="text-label text-muted-foreground sm:ml-auto">
              la barre montre le temps gagné ou perdu
            </p>
          </div>
          <table className="w-full border-collapse text-body max-sm:hidden">
            <caption className="sr-only">
              {year} comparé à {previous.year}, section par section
            </caption>
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={cn(head, "pl-0 text-left")}>
                  Section
                </th>
                <th scope="col" className={head}>
                  {previous.year}
                </th>
                <th scope="col" className={head}>
                  {year}
                </th>
                <th scope="col" className={head}>
                  Écart
                </th>
                <th scope="col" className="w-1/4">
                  <span className="sr-only">Écart en barre</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.sections.map((section) => (
                <tr
                  key={section.label}
                  className="border-b border-border last:border-b-0"
                >
                  <th scope="row" className="py-2.5 pr-2 text-left font-medium">
                    {section.label}
                  </th>
                  <td className={cn(cell, "text-secondary-foreground")}>
                    {section.previous ?? "—"}
                  </td>
                  <td className={cn(cell, "font-semibold")}>
                    {section.current ?? "—"}
                  </td>
                  <td className={cn(cell, tone(section.deltaSeconds))}>
                    {section.delta ?? "—"}
                  </td>
                  <td className="pl-2" aria-hidden="true">
                    {bar(section.deltaSeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul
            aria-label={`${year} comparé à ${previous.year}, section par section`}
            className="flex flex-col sm:hidden"
          >
            {comparison.sections.map((section) => (
              <li
                key={section.label}
                className="flex flex-col gap-1.5 border-t border-border py-2.5 first:border-t-0"
              >
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 font-medium">
                    {section.label}
                  </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      tone(section.deltaSeconds),
                    )}
                  >
                    {section.delta ?? "—"}
                  </span>
                </div>
                <p className="text-label text-secondary-foreground tabular-nums">
                  {previous.year} {section.previous ?? "—"} · {year}{" "}
                  <span className="font-semibold text-foreground">
                    {section.current ?? "—"}
                  </span>
                </p>
                <div aria-hidden="true">{bar(section.deltaSeconds)}</div>
              </li>
            ))}
          </ul>
          {(!current.series || !previous.series) && (
            <p className="text-label text-muted-foreground">
              Sans le tracé détaillé des deux sorties, seul le temps total se
              compare.
            </p>
          )}
        </section>
        {(changes.length > 0 || conditions.rows.length > 0) && (
          <aside
            aria-label="Entre les deux éditions"
            className="flex flex-col gap-5 xl:border-l xl:border-border xl:pl-5"
          >
            {changes.length > 0 && (
              <section
                aria-labelledby="compare-changes"
                className="flex flex-col gap-2"
              >
                <h2
                  id="compare-changes"
                  className="text-label font-medium text-muted-foreground"
                >
                  Ce qui a changé entre les deux
                </h2>
                <dl className="flex flex-col">
                  {changes.map((change) => (
                    <div
                      key={change.key}
                      className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-border py-1.5"
                    >
                      <dt className="text-secondary-foreground">
                        {change.label}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {change.value}
                      </dd>
                      <dd className="text-label text-muted-foreground tabular-nums">
                        {change.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-label text-pretty text-muted-foreground">
                  FC moyenne du premier tronçon, glucides et marche de ton plan
                  de course, temps de course des 16 semaines d’avant.
                </p>
              </section>
            )}
            {conditions.rows.length > 0 && (
              <section
                aria-labelledby="compare-conditions"
                className="flex flex-col gap-2"
              >
                <h2
                  id="compare-conditions"
                  className="text-label font-medium text-muted-foreground"
                >
                  Conditions
                </h2>
                <dl className="flex flex-col">
                  {conditions.rows.map((row) => (
                    <div
                      key={row.year}
                      className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-border py-1.5"
                    >
                      <dt className="text-secondary-foreground tabular-nums">
                        {row.year}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {row.temperature}
                      </dd>
                      <dd className="text-label text-muted-foreground">
                        {row.sky}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-label text-pretty text-muted-foreground">
                  {conditions.reading ? `${conditions.reading} ` : ""}
                  Température la plus haute pendant ta course, au départ. Source
                  : Open-Meteo.
                </p>
              </section>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
