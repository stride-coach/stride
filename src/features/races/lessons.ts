import { z } from "zod";
import type { PassageCheck } from "./after-race";
import { raceEditions } from "./editions";
import { formatDuration } from "./format";
import type { RaceSummary } from "./race";
import { formatResultDelta, formatResultTime } from "./results";

export const lessonKinds = ["keep", "change"] as const;
export type LessonKind = (typeof lessonKinds)[number];

export const lessonKindLabels: Record<LessonKind, string> = {
  keep: "Garder",
  change: "Changer",
};

export type RaceLesson = {
  id: string;
  kind: LessonKind;
  body: string;
  position: number;
};

export type LessonSuggestion = { kind: LessonKind; body: string };

export const maximumLessons = 8;

const significantSeconds = 120;

export const lessonColumns = "id, race_id, kind, body, position";

export const lessonRowSchema = z
  .object({
    id: z.uuid(),
    race_id: z.uuid(),
    kind: z.enum(lessonKinds),
    body: z.string(),
    position: z.number().int(),
  })
  .transform((row) => ({
    raceId: row.race_id,
    lesson: {
      id: row.id,
      kind: row.kind,
      body: row.body,
      position: row.position,
    } satisfies RaceLesson,
  }));

export const lessonInputSchema = z.object({
  raceId: z.uuid(),
  kind: z.enum(lessonKinds),
  body: z.string().trim().min(1).max(200),
});

export function lessonSuggestions({
  passages,
  resultSeconds,
  targetSeconds,
  saved,
}: {
  passages: PassageCheck[];
  resultSeconds: number;
  targetSeconds: number | null;
  saved: RaceLesson[];
}): LessonSuggestion[] {
  let best: { from: string; to: string; seconds: number } | null = null;
  let worst: { from: string; to: string; seconds: number } | null = null;
  let previous = { name: "Départ", deltaSeconds: 0 };
  for (const passage of passages) {
    const seconds = passage.deltaSeconds - previous.deltaSeconds;
    const section = { from: previous.name, to: passage.name, seconds };
    if (!best || seconds < best.seconds) best = section;
    if (!worst || seconds > worst.seconds) worst = section;
    previous = passage;
  }
  const sectionText = (section: {
    from: string;
    to: string;
    seconds: number;
  }) =>
    `${section.from} → ${section.to} : ${formatResultDelta(section.seconds)} sur le plan.`;
  const suggestions: LessonSuggestion[] = [];
  if (best && best.seconds <= -significantSeconds)
    suggestions.push({ kind: "keep", body: sectionText(best) });
  if (worst && worst.seconds >= significantSeconds)
    suggestions.push({ kind: "change", body: sectionText(worst) });
  if (targetSeconds !== null && resultSeconds <= targetSeconds)
    suggestions.push({
      kind: "keep",
      body: `L’objectif de ${formatDuration(targetSeconds)}, tenu en ${formatResultTime(resultSeconds)}.`,
    });
  const kept = new Set(saved.map((lesson) => lesson.body));
  return suggestions.filter((item) => !kept.has(item.body));
}

export function lessonSource({
  races,
  race,
  today,
  lessons,
}: {
  races: RaceSummary[];
  race: RaceSummary;
  today: string;
  lessons: Record<string, RaceLesson[]>;
}) {
  const withLessons = (item: RaceSummary) =>
    (lessons[item.id]?.length ?? 0) > 0;
  const edition = raceEditions(races, race, today).find(withLessons);
  if (edition)
    return { race: edition, lessons: lessons[edition.id], edition: true };
  const latest = races
    .filter(
      (item): item is RaceSummary & { date: string } =>
        item.id !== race.id &&
        item.date !== null &&
        item.date < today &&
        withLessons(item),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest
    ? { race: latest, lessons: lessons[latest.id], edition: false }
    : null;
}
