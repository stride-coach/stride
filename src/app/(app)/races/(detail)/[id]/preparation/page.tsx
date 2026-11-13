import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import { Status } from "@/components/stride/status";
import { Chip } from "@/components/stride/chip";
import { expectationLabels } from "@/features/races/race-details";
import { cn } from "@/lib/utils";
import { localToday } from "@/features/app-shell/shell";
import { sessionStatuses } from "@/features/plans/matching/adherence";
import {
  DemandList,
  PriorityBadge,
} from "@/features/races/components/races-overview";
import { EmptyState, RaceCard } from "@/features/races/components/race-ui";
import { SeasonStrip } from "@/features/races/components/season-strip";
import { raceOnTrack } from "@/features/races/on-track";
import {
  preparationProgress,
  preparationRows,
} from "@/features/races/overview";
import {
  preparationRaces,
  raceKeySessions,
  type KeySessionItem,
  type KeySessionState,
} from "@/features/races/preparation";
import { raceDemands } from "@/features/races/season";
import { requireAthlete } from "@/server/app/session";
import { loadPlanOverview } from "@/server/plans/overview";
import { loadRace } from "@/server/races/load";
import { loadOnTrackInputs } from "@/server/races/on-track";
import { listRaces } from "@/server/races/races";
import { readRaceLessons } from "@/server/races/lesson-store";
import { lessonSource } from "@/features/races/lessons";
import { LessonKindStatus } from "@/features/races/components/race-lessons";

const sessionStates: Record<
  KeySessionState,
  { label: string; level: "ok" | "watch" | "muted" }
> = {
  done: { label: "Faite", level: "ok" },
  partial: { label: "En partie", level: "watch" },
  missed: { label: "Manquée", level: "watch" },
  upcoming: { label: "À venir", level: "muted" },
};

const rowStates = {
  done: { label: "Prêt", level: "ok" },
  partial: { label: "En cours", level: "watch" },
  todo: { label: "À faire", level: "muted" },
} as const;

function StateLabel({
  state,
}: {
  state: { label: string; level: "ok" | "watch" | "muted" };
}) {
  return state.level === "muted" ? (
    <span className="text-label whitespace-nowrap text-muted-foreground">
      {state.label}
    </span>
  ) : (
    <Status level={state.level}>{state.label}</Status>
  );
}

const visibleKeys = 6;

function nextKeys(items: KeySessionItem[]) {
  const upcoming = items.filter((item) => item.state === "upcoming");
  return (upcoming.length ? upcoming : items.slice(-visibleKeys)).slice(
    0,
    visibleKeys,
  );
}

function KeySessionList({ items }: { items: KeySessionItem[] }) {
  return (
    <ul className="flex flex-col rounded-xl border border-border bg-card">
      {items.map((item) => (
        <li
          key={item.sessionKey}
          className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
        >
          <span className="w-16 shrink-0 text-label text-muted-foreground tabular-nums">
            {item.date}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <Link href={item.href} className="font-medium hover:text-primary">
              {item.title}
            </Link>
            {item.purpose && (
              <span className="text-label text-pretty text-secondary-foreground">
                {item.purpose}
              </span>
            )}
          </span>
          <StateLabel state={sessionStates[item.state]} />
        </li>
      ))}
    </ul>
  );
}

export default async function RacePreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const today = localToday(new Date());
  const context = await requireAthlete();
  const { id } = await params;
  const [{ data }, inputs, overview, races] = await Promise.all([
    loadRace(id),
    loadOnTrackInputs(context, today),
    loadPlanOverview(context).catch(() => null),
    listRaces(context),
  ]);
  const rows = preparationRows(data);
  const onTrack = raceOnTrack(data.race, inputs, preparationProgress(rows));
  if (!onTrack || !data.race.date)
    return (
      <EmptyState title="Préparation terminée">
        Cette course est passée ou n’a pas encore de date : il n’y a plus de
        chemin à suivre jusqu’à elle.
      </EmptyState>
    );
  const season =
    inputs.program?.seasons.find(
      (item) =>
        item.raceId === data.race.id || item.raceIds.includes(data.race.id),
    ) ?? null;
  const keys =
    season && overview
      ? raceKeySessions({
          sessions: overview.plan.state.sessions,
          statuses: sessionStatuses(overview.matches),
          weekStarts: season.weeks.map((week) => week.weekStart),
          raceDate: data.race.date,
          today,
        })
      : null;
  const demands = raceDemands(data.race, {
    longestRunMeters: inputs.longestRunMeters,
    maxWeeklyGainMeters: inputs.maxWeeklyGainMeters,
    maxWeeklyRunSeconds: inputs.maxWeeklyRunSeconds,
  });
  const prep = preparationRaces(races, data.race, today);
  const pastIds = races
    .filter(
      (item) => item.id !== data.race.id && item.date && item.date < today,
    )
    .map((item) => item.id);
  const kept = lessonSource({
    races,
    race: data.race,
    today,
    lessons: await readRaceLessons(context, pastIds),
  });
  const reading = onTrack.goal.verdict;
  return (
    <>
      {reading && (
        <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
          <StrideMark className="mt-1 size-3.5 shrink-0" />
          {reading}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {season ? (
            <SeasonStrip season={season} raceId={data.race.id} />
          ) : (
            <EmptyState title="Cette course n’est pas dans ton plan">
              Le programme et les séances clés apparaîtront quand ton plan
              préparera cette course.
            </EmptyState>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {demands.length > 0 && (
              <RaceCard>
                <DemandList demands={demands} headingId="prep-demands" />
              </RaceCard>
            )}
            {keys && (
              <section
                aria-labelledby="prep-keys"
                className="flex flex-col gap-2"
              >
                <div className="flex items-baseline gap-3">
                  <h2 id="prep-keys" className="font-semibold">
                    Séances clés pour cette course
                  </h2>
                  <span className="text-label text-muted-foreground tabular-nums">
                    {keys.done} / {keys.total}
                  </span>
                </div>
                {keys.total === 0 ? (
                  <p className="text-secondary-foreground">
                    Ton plan ne marque aucune séance clé avant cette course.
                  </p>
                ) : (
                  <>
                    <KeySessionList items={nextKeys(keys.items)} />
                    {keys.items.length > nextKeys(keys.items).length && (
                      <details className="group">
                        <summary className="inline-flex min-h-control-touch cursor-pointer items-center text-label text-primary hover:text-foreground md:min-h-0">
                          Voir les {keys.total} séances clés
                        </summary>
                        <div className="pt-2">
                          <KeySessionList items={keys.items} />
                        </div>
                      </details>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
        </div>
        <aside aria-label="Avant la course" className="flex flex-col gap-5">
          <RaceCard aria-labelledby="prep-before">
            <h2
              id="prep-before"
              className="text-label font-medium text-muted-foreground"
            >
              Avant la course
            </h2>
            <ul className="flex flex-col">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-baseline gap-3 border-t border-border py-2 first:border-t-0 first:pt-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    {row.href ? (
                      <Link
                        href={row.href}
                        className="font-medium hover:text-primary"
                      >
                        {row.label}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.label}</span>
                    )}
                    <span className="text-label text-muted-foreground">
                      {row.detail}
                    </span>
                  </span>
                  <StateLabel state={rowStates[row.state]} />
                </li>
              ))}
            </ul>
          </RaceCard>
          {(data.details.expectation || data.details.testItems.length > 0) && (
            <RaceCard aria-labelledby="prep-tests">
              <h2
                id="prep-tests"
                className="text-label font-medium text-muted-foreground"
              >
                À tester ce jour-là
              </h2>
              {data.details.expectation && (
                <p className="text-secondary-foreground">
                  Ce que tu en attends :{" "}
                  <span className="font-medium text-foreground">
                    {expectationLabels[data.details.expectation]}
                  </span>
                </p>
              )}
              {data.details.testItems.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {data.details.testItems.map((item) => (
                    <li key={item}>
                      <Chip>{item}</Chip>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/races/${data.race.id}/edit`}
                className="self-start text-label text-primary hover:text-foreground"
              >
                Modifier
              </Link>
            </RaceCard>
          )}
          {kept && (
            <RaceCard aria-labelledby="prep-lessons">
              <h2
                id="prep-lessons"
                className="text-label font-medium text-muted-foreground"
              >
                {kept.edition
                  ? `Ce que tu gardes de l’édition ${kept.race.date.slice(0, 4)}`
                  : `Ce que tu gardes de ${kept.race.name}`}
              </h2>
              <ul className="flex flex-col">
                {kept.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex flex-col gap-0.5 border-t border-border py-2 first:border-t-0 first:pt-0"
                  >
                    <LessonKindStatus kind={lesson.kind} />
                    <span className="text-pretty">{lesson.body}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/races/${kept.race.id}/after`}
                className="self-start text-label text-primary hover:text-foreground"
              >
                Voir l’après-course
              </Link>
            </RaceCard>
          )}
          {prep.length > 0 && (
            <RaceCard aria-labelledby="prep-races">
              <h2
                id="prep-races"
                className="text-label font-medium text-muted-foreground"
              >
                Courses de préparation
              </h2>
              <ul className="flex flex-col gap-2">
                {prep.map((race) => (
                  <li key={race.id} className="flex items-center gap-2.5">
                    <PriorityBadge priority={race.priority} small />
                    <Link
                      href={`/races/${race.id}`}
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium hover:text-primary",
                      )}
                    >
                      <span className="sr-only">Course {race.priority} · </span>
                      {race.name}
                    </Link>
                    <span className="text-label text-muted-foreground tabular-nums">
                      {race.date}
                    </span>
                  </li>
                ))}
              </ul>
            </RaceCard>
          )}
        </aside>
      </div>
    </>
  );
}
