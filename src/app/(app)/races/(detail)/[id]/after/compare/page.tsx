import { redirect } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { AfterViews } from "@/features/races/components/after-views";
import { EmptyState } from "@/features/races/components/race-ui";
import { compareEditions } from "@/features/races/editions";
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
  const { editions, chosen, current, previous } = await loadEditions(
    context,
    { ...data.race, date: raceDate },
    today,
    typeof query.with === "string" ? query.with : null,
  );
  const views = <AfterViews base={base} current="compare" />;
  if (!chosen)
    return (
      <>
        {views}
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
        <div className="flex flex-wrap gap-2">
          {views}
          {picker}
        </div>
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
  const maxGap = Math.max(
    1,
    ...comparison.sections.map((section) =>
      Math.abs(section.deltaSeconds ?? 0),
    ),
  );
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {views}
        {picker}
      </div>
      <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
        <StrideMark className="mt-1 size-3.5 shrink-0" />
        {comparison.reading}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-80 border-collapse text-body">
          <caption className="sr-only">
            {year} comparé à {previous.year}
          </caption>
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className={cn(head, "text-left")}>
                <span className="sr-only">Mesure</span>
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
            </tr>
          </thead>
          <tbody>
            {comparison.figures.map((figure) => (
              <tr
                key={figure.key}
                className="border-b border-border last:border-b-0"
              >
                <th
                  scope="row"
                  className="px-2 py-2.5 text-left font-normal text-secondary-foreground"
                >
                  {figure.label}
                </th>
                <td className={cn(cell, "text-secondary-foreground")}>
                  {figure.previous}
                </td>
                <td className={cn(cell, "font-semibold")}>{figure.current}</td>
                <td className={cell}>{figure.delta ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section
        aria-labelledby="compare-sections"
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 id="compare-sections" className="font-semibold">
            Section par section
          </h2>
          <p className="text-label text-muted-foreground">
            la barre montre le temps gagné ou perdu
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-80 border-collapse text-body">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={cn(head, "text-left")}>
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
                <th scope="col" className="w-1/5 max-sm:hidden">
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
                  <th scope="row" className="px-2 py-2.5 text-left font-normal">
                    {section.label}
                  </th>
                  <td className={cn(cell, "text-secondary-foreground")}>
                    {section.previous ?? "—"}
                  </td>
                  <td className={cn(cell, "font-semibold")}>
                    {section.current ?? "—"}
                  </td>
                  <td
                    className={cn(
                      cell,
                      section.deltaSeconds === null
                        ? "text-muted-foreground"
                        : section.deltaSeconds > 0
                          ? "text-warning"
                          : "text-primary",
                    )}
                  >
                    {section.delta ?? "—"}
                  </td>
                  <td className="px-2 max-sm:hidden" aria-hidden="true">
                    {section.deltaSeconds !== null && (
                      <span className="relative block h-1.5 rounded-full bg-muted">
                        <span
                          className={cn(
                            "absolute inset-y-0 rounded-full",
                            section.deltaSeconds > 0
                              ? "left-1/2 bg-warning"
                              : "right-1/2 bg-primary",
                          )}
                          style={{
                            width: `${(Math.abs(section.deltaSeconds) / maxGap) * 50}%`,
                          }}
                        />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!current.series || !previous.series) && (
          <p className="text-label text-muted-foreground">
            Sans le tracé détaillé des deux sorties, seul le temps total se
            compare.
          </p>
        )}
      </section>
    </>
  );
}
