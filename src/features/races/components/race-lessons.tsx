"use client";

import { useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Status } from "@/components/stride/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addRaceLesson, deleteRaceLesson } from "@/server/races/lessons";
import {
  lessonKindLabels,
  lessonKinds,
  type LessonKind,
  type LessonSuggestion,
  type RaceLesson,
} from "../lessons";
import { actionMessage } from "../messages";

const levels = { keep: "ok", change: "watch" } as const;

export function LessonKindStatus({ kind }: { kind: LessonKind }) {
  return <Status level={levels[kind]}>{lessonKindLabels[kind]}</Status>;
}

function LessonRow({
  kind,
  body,
  action,
}: {
  kind: LessonKind;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-border py-2.5 first:border-t-0">
      <LessonKindStatus kind={kind} />
      <span className="text-pretty">{body}</span>
      {action}
    </li>
  );
}

export function RaceLessons({
  raceId,
  lessons,
  suggestions,
  limit,
}: {
  raceId: string;
  lessons: RaceLesson[];
  suggestions: LessonSuggestion[];
  limit: number;
}) {
  const [kind, setKind] = useState<LessonKind>("keep");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const full = lessons.length >= limit;

  const add = (lesson: LessonSuggestion, after?: () => void) =>
    startTransition(async () => {
      const result = await addRaceLesson({ raceId, ...lesson });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      after?.();
    });

  const remove = (lesson: RaceLesson) =>
    startTransition(async () => {
      const result = await deleteRaceLesson({ raceId, lessonId: lesson.id });
      if (result.status !== "saved") toast.error(actionMessage(result.status));
    });

  return (
    <section
      aria-labelledby="after-lessons"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="after-lessons" className="font-semibold">
          Ce qu’on garde pour la prochaine
        </h2>
        <p className="text-label text-muted-foreground sm:ml-auto">
          repris dans ta prochaine préparation
        </p>
      </div>
      {lessons.length > 0 ? (
        <ul aria-label="Tes lignes pour la prochaine" className="flex flex-col">
          {lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              kind={lesson.kind}
              body={lesson.body}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={`Supprimer « ${lesson.body} »`}
                  onClick={() => remove(lesson)}
                >
                  <XIcon />
                </Button>
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-secondary-foreground">
          Note ce que tu gardes et ce que tu changes : Stride te le rappellera
          en préparant ta prochaine course.
        </p>
      )}
      {suggestions.length > 0 && !full && (
        <div className="flex flex-col gap-1">
          <h3 className="text-label font-medium text-muted-foreground">
            Ce que Stride a relevé
          </h3>
          <ul aria-label="Ce que Stride a relevé" className="flex flex-col">
            {suggestions.map((suggestion) => (
              <LessonRow
                key={suggestion.body}
                kind={suggestion.kind}
                body={suggestion.body}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    aria-label={`Ajouter « ${suggestion.body} »`}
                    onClick={() => add(suggestion)}
                  >
                    Ajouter
                  </Button>
                }
              />
            ))}
          </ul>
        </div>
      )}
      {!full && (
        <form
          aria-label="Ajouter une ligne"
          className="flex flex-wrap items-center gap-2 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            add({ kind, body }, () => setBody(""));
          }}
        >
          <div
            role="group"
            aria-label="Garder ou changer"
            className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5"
          >
            {lessonKinds.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={kind === item}
                onClick={() => setKind(item)}
                className="inline-flex min-h-control-touch items-center rounded-md px-3 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-7"
              >
                {lessonKindLabels[item]}
              </button>
            ))}
          </div>
          <Input
            aria-label="Ce que tu retiens"
            value={body}
            maxLength={200}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Le ravitaillement de nuit, la descente sous la pluie…"
            className="min-w-48 flex-1"
          />
          <Button type="submit" disabled={pending || !body.trim()}>
            Ajouter
          </Button>
        </form>
      )}
    </section>
  );
}
