"use client";

import { cn } from "@/lib/utils";
import type { CheckinDay } from "../body";
import type { Checkin, Legs } from "../recovery";
import { CheckinQuestions, useCheckinAnswers } from "./checkin-questions";

const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

const legsDots: Record<Legs, string> = {
  fresh: "bg-primary",
  normal: "bg-secondary-foreground",
  heavy: "bg-warning",
};

export function CheckinCard({
  initial,
  history,
}: {
  initial: Checkin | null;
  history: { days: CheckinDay[]; label: string };
}) {
  const { answers, savedAt, answer } = useCheckinAnswers(initial);

  const days = history.days.map((day, index) =>
    index === history.days.length - 1 ? { ...day, legs: answers.legs } : day,
  );
  return (
    <section
      aria-labelledby="body-checkin"
      className="flex flex-col gap-3 border-b border-border py-4.5 last:border-b-0"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="body-checkin"
          className="text-label font-medium text-muted-foreground"
        >
          Ton ressenti
        </h2>
        <span className="text-label text-muted-foreground" aria-live="polite">
          {savedAt
            ? `ce matin · enregistré à ${time.format(new Date(savedAt))}`
            : "À saisir ce matin"}
        </span>
      </div>
      <CheckinQuestions
        answers={answers}
        onAnswer={answer}
        idPrefix="checkin"
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-secondary-foreground">
          7 matins · jambes
        </span>
        <ol
          aria-label={history.label}
          className="grid grid-cols-7 gap-1 text-label text-muted-foreground"
        >
          {days.map((day) => (
            <li key={day.day} className="flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2.5 rounded-full",
                  day.legs
                    ? legsDots[day.legs]
                    : "border border-control-border",
                )}
              />
              <span aria-hidden="true">{day.weekday}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-label text-muted-foreground">
        Stride lit les tendances pour guider ton entraînement, il ne pose pas de
        diagnostic. Une douleur qui change ta foulée ou qui dure plus de
        quelques jours, c’est pour un kiné ou un médecin.
      </p>
    </section>
  );
}
