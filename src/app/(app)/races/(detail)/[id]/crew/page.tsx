import { redirect } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { CoachNote } from "@/components/stride/coach-note";
import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CrewDetailsButton } from "@/features/races/components/crew-details";
import { MapCard } from "@/features/races/components/map-card";
import { EmptyState } from "@/features/races/components/race-ui";
import { crewLinkPeriod } from "@/features/races/crew-link";
import { CrewLinkPanel } from "@/features/races/components/crew-link-panel";
import { readCrewLink, siteOrigin } from "@/server/races/crew-link";
import { loadRace } from "@/server/races/load";
import { chartViews, crewFor } from "@/server/races/views";

const head = "px-2 py-2 text-left text-label font-normal text-muted-foreground";
const cell = "px-2 py-2 align-middle tabular-nums";

export default async function CrewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { context, data } = await loadRace(id);
  if (data.race.kind === "road") redirect(`/races/${id}`);
  const link = await readCrewLink(context, id);
  const result = crewFor(data);
  if (!result)
    return (
      <EmptyState
        title="Prépare ton assistance"
        action={
          <Button asChild variant="outline">
            <Link href={`/races/${id}${data.course ? "" : "/course"}`}>
              {data.course ? "Définir un objectif de temps" : "Ajouter le GPX"}
            </Link>
          </Button>
        }
      >
        Avec le parcours et un objectif de temps, Stride dit à ton assistance où
        et quand te retrouver.
      </EmptyState>
    );
  const { crew, views } = result;
  const { map, profile } = chartViews(views.model, views.planned, null);
  const editor = (
    point: { id: string; name: string; editable: boolean },
    mode: "crew" | "gap",
  ) => {
    const waypoint = data.waypoints.find((item) => item.id === point.id);
    return point.editable && waypoint ? (
      <CrewDetailsButton
        raceId={id}
        waypointId={point.id}
        name={point.name}
        mode={mode}
        access={waypoint.crewAccess}
        prepare={waypoint.crewPrepare}
        reason={waypoint.crewReason}
      />
    ) : null;
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <CoachNote>{crew.reading}</CoachNote>
        <Widget
          headingLevel={2}
          aria-labelledby="crew-points"
          title={<span id="crew-points">Où et quand te retrouver</span>}
          verdict={
            crew.windows ? (
              <span className="text-label font-normal text-muted-foreground max-sm:hidden">
                fenêtre entre tes scénarios ambitieux et prudent
              </span>
            ) : null
          }
        >
          <table className="w-full border-collapse text-body max-md:hidden">
            <thead className="border-b border-border">
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
                <th scope="col" className={head}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {crew.points.map((point) => (
                <tr
                  key={point.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className={cn(cell, "font-medium")}>{point.name}</td>
                  <td className={cell}>{point.distance}</td>
                  <td className={cn(cell, "font-semibold")}>{point.planned}</td>
                  <td className={cell}>{point.window ?? "—"}</td>
                  <td className={cn(cell, "text-secondary-foreground")}>
                    {point.access ?? "—"}
                  </td>
                  <td className={cn(cell, "text-secondary-foreground")}>
                    {point.prepare ?? "—"}
                  </td>
                  <td className={cn(cell, "text-right")}>
                    {editor(point, "crew")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="flex flex-col md:hidden">
            {crew.points.map((point) => (
              <li
                key={point.id}
                className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {point.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      {point.distance}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {point.window ?? point.planned}
                  </span>
                </div>
                {point.access && (
                  <span className="text-secondary-foreground">
                    {point.access}
                  </span>
                )}
                {point.prepare && <span>À préparer : {point.prepare}</span>}
                <div className="-ml-2.5">{editor(point, "crew")}</div>
              </li>
            ))}
          </ul>
        </Widget>
        <MapCard
          data={map}
          segments={profile.segments}
          title={data.race.name}
          rainLabel="Météo"
          hasWeather={false}
        />
        {crew.gaps.length > 0 && (
          <Widget
            headingLevel={2}
            aria-labelledby="crew-gaps"
            title={<span id="crew-gaps">Sans assistance</span>}
          >
            <ul className="flex flex-col">
              {crew.gaps.map((gap) => (
                <li
                  key={gap.id}
                  className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span className="w-40 shrink-0 font-medium">{gap.name}</span>
                  <span className="min-w-0 flex-1 text-secondary-foreground">
                    {gap.reason ?? "Assistance non prévue"}
                  </span>
                  {editor(gap, "gap")}
                </li>
              ))}
            </ul>
            <p className="pt-2 text-label text-muted-foreground">
              Pour ouvrir un ravito à ton assistance, coche « Assistance » dans
              ses{" "}
              <Link
                href={`/races/${id}/waypoints`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                points de passage
              </Link>
              .
            </p>
          </Widget>
        )}
      </div>
      <aside className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5 xl:sticky xl:top-4">
        <h2 className="text-body font-medium text-secondary-foreground">
          Partager avec ton assistance
        </h2>
        <CrewLinkPanel
          raceId={id}
          link={link}
          origin={siteOrigin()}
          period={crewLinkPeriod(data.race.date)}
        />
        <Button asChild variant="outline">
          <a
            href={`/races/${id}/print?sheet=crew&print=1`}
            target="_blank"
            rel="noopener"
          >
            Imprimer la feuille d’assistance
          </a>
        </Button>
      </aside>
    </div>
  );
}
