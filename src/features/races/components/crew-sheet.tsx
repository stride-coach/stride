import { cn } from "@/lib/utils";
import type { CrewPlan } from "../crew";

const head =
  "border-b border-foreground px-1.5 py-1 text-left text-label font-medium text-muted-foreground";
const cell = "border-b border-border px-1.5 py-1.5 align-top tabular-nums";

export function CrewSheet({
  name,
  subtitle,
  crew,
  printedAt,
}: {
  name: string;
  subtitle: string;
  crew: CrewPlan;
  printedAt: string;
}) {
  return (
    <article className="flex flex-col gap-3 bg-card p-6 text-body text-foreground">
      <header className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-title font-semibold">Feuille d’assistance</h1>
        <p className="text-muted-foreground">
          {name} · {subtitle}
        </p>
      </header>
      {crew.windows && (
        <p>
          Chaque fenêtre va du scénario ambitieux au prudent : arrive au début
          de la fenêtre.
        </p>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={head}>
              Point
            </th>
            <th scope="col" className={head}>
              Au km
            </th>
            <th scope="col" className={head}>
              Prévu
            </th>
            <th scope="col" className={head}>
              Fenêtre
            </th>
            <th scope="col" className={head}>
              Accès
            </th>
            <th scope="col" className={head}>
              À préparer
            </th>
          </tr>
        </thead>
        <tbody>
          {crew.points.map((point) => (
            <tr key={point.id}>
              <td className={cn(cell, "font-medium")}>{point.name}</td>
              <td className={cell}>{point.distance}</td>
              <td className={cn(cell, "font-semibold")}>{point.planned}</td>
              <td className={cell}>{point.window ?? "—"}</td>
              <td className={cell}>{point.access ?? "—"}</td>
              <td className={cell}>{point.prepare ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {crew.gaps.length > 0 && (
        <p>
          <span className="font-semibold">Sans assistance</span>{" "}
          {crew.gaps
            .map((gap) =>
              gap.reason ? `${gap.name} (${gap.reason})` : gap.name,
            )
            .join(" · ")}
        </p>
      )}
      <p className="text-micro text-muted-foreground">
        Imprimé le {printedAt} · Stride
      </p>
    </article>
  );
}
