import { cn } from "@/lib/utils";
import type { PrintedRoadbook, RoadbookOptions } from "../printed-roadbook";

function Band({ roadbook }: { roadbook: PrintedRoadbook }) {
  return (
    <section aria-label="Bracelet" className="flex flex-col gap-1">
      <p className="text-micro font-semibold">
        {roadbook.title} · {roadbook.subtitle}
      </p>
      <table className="w-full border-collapse border border-foreground text-micro tabular-nums">
        <tbody>
          <tr>
            {roadbook.band.map((stop) => (
              <th
                key={stop.id}
                scope="col"
                className="border border-foreground px-1 py-0.5 text-left font-semibold"
              >
                {stop.name}
              </th>
            ))}
          </tr>
          <tr>
            {roadbook.band.map((stop) => (
              <td
                key={stop.id}
                className="border border-foreground px-1 py-0.5"
              >
                km {stop.distance} · {stop.passage}
                {stop.cutoff && (
                  <span className="block font-semibold">BH {stop.cutoff}</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export function RoadbookSheet({
  roadbook,
  options,
  printedAt,
}: {
  roadbook: PrintedRoadbook;
  options: RoadbookOptions;
  printedAt: string;
}) {
  if (options.format === "band")
    return (
      <article className="flex flex-col gap-3 p-4">
        <Band roadbook={roadbook} />
        <p className="text-micro text-muted-foreground print:hidden">
          Découpe la bande et fixe-la autour du poignet.
        </p>
        <p className="text-micro text-muted-foreground">
          Imprimé le {printedAt} · Stride
        </p>
      </article>
    );
  const small = options.format === "a6";
  const head = cn(
    "border-b border-foreground px-1.5 py-1 text-left font-medium text-muted-foreground",
    small ? "text-micro" : "text-label",
  );
  const cell = cn(
    "border-b border-border px-1.5 align-top tabular-nums",
    small ? "py-1" : "py-1.5",
  );
  const number = "whitespace-nowrap text-right";
  return (
    <article
      className={cn(
        "flex flex-col gap-3 bg-card text-foreground",
        small ? "p-3 text-label" : "p-6 text-body",
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1
            className={cn("font-semibold", small ? "text-body" : "text-title")}
          >
            {roadbook.title}
          </h1>
          <p className="text-muted-foreground">{roadbook.subtitle}</p>
        </div>
        {roadbook.estimate && (
          <p className="font-medium">Estimation sans tracé</p>
        )}
      </header>
      <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
        {roadbook.facts.map((fact) => (
          <li key={fact} className="font-medium">
            {fact}
          </li>
        ))}
      </ul>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={cn(head, "w-6")}>
              <span className="sr-only">Numéro</span>
            </th>
            <th scope="col" className={head}>
              Section
            </th>
            <th scope="col" className={cn(head, number)}>
              Dist.
            </th>
            <th scope="col" className={cn(head, number)}>
              D+
            </th>
            {!small && (
              <th scope="col" className={cn(head, number)}>
                Allure
              </th>
            )}
            {options.walk && !small && (
              <th scope="col" className={cn(head, number)}>
                Marche
              </th>
            )}
            {options.weather && (
              <th scope="col" className={head}>
                Météo
              </th>
            )}
            {options.intake && (
              <th scope="col" className={head}>
                À prendre
              </th>
            )}
            <th scope="col" className={cn(head, number)}>
              Passage
            </th>
          </tr>
        </thead>
        <tbody>
          {roadbook.rows.map((row) => (
            <tr key={row.index}>
              <td className={cn(cell, "text-muted-foreground")}>{row.index}</td>
              <td className={cn(cell, "font-medium")}>{row.section}</td>
              <td className={cn(cell, number)}>{row.distance}</td>
              <td className={cn(cell, number)}>{row.gain ?? "—"}</td>
              {!small && (
                <td className={cn(cell, number)}>{row.pace ?? "—"}</td>
              )}
              {options.walk && !small && (
                <td className={cn(cell, number)}>{row.walk}</td>
              )}
              {options.weather && (
                <td className={cell}>{row.weather ?? "—"}</td>
              )}
              {options.intake && <td className={cell}>{row.intake ?? "—"}</td>}
              <td className={cn(cell, number, "font-semibold")}>
                {row.passage}
                {row.cutoff && (
                  <span className="block font-normal text-muted-foreground">
                    {row.cutoff}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="flex flex-col gap-1">
        <p className="flex flex-wrap gap-x-4">
          {roadbook.barriers && (
            <span>
              <span className="font-semibold">Barrières</span>{" "}
              {roadbook.barriers}
            </span>
          )}
          {options.weather && roadbook.rain && (
            <span>
              <span className="font-semibold">Pluie</span> {roadbook.rain}
            </span>
          )}
          {options.intake && roadbook.totals.carbs && (
            <span>
              <span className="font-semibold">Total</span>{" "}
              {roadbook.totals.carbs}
            </span>
          )}
        </p>
        <p className="text-micro text-muted-foreground">
          Imprimé le {printedAt} · Stride
        </p>
      </footer>
    </article>
  );
}
