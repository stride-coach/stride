"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { saveCheckin, type CheckinResult } from "@/server/progress/actions";
import {
  sleepFeelOptions,
  sorenessOptions,
  stressOptions,
  type Checkin,
  type CheckinField,
  type Legs,
} from "../recovery";
import {
  legsLabels,
  sleepFeelLabels,
  sorenessLabels,
  stressLabels,
} from "../recovery-view";

const errors = {
  invalid: "Cette réponse n’est pas valide.",
  error: "Enregistrement impossible. Réessaie dans un instant.",
  "session-expired": "Ta session a expiré. Reconnecte-toi pour enregistrer.",
} as const;

const legsOrder: readonly Legs[] = ["fresh", "normal", "heavy"];

const questions = [
  { field: "legs", label: "Jambes", options: legsOrder, labels: legsLabels },
  {
    field: "sleepFeel",
    label: "Sommeil ressenti",
    options: sleepFeelOptions,
    labels: sleepFeelLabels,
  },
  {
    field: "soreness",
    label: "Courbatures",
    options: sorenessOptions,
    labels: sorenessLabels,
  },
  {
    field: "stress",
    label: "Stress hors sport",
    options: stressOptions,
    labels: stressLabels,
  },
] as const;

export type CheckinAnswers = Pick<
  Checkin,
  "legs" | "sleepFeel" | "soreness" | "stress"
>;

export function useCheckinAnswers(
  initial: Checkin | null,
  save: (input: CheckinField) => Promise<CheckinResult> = saveCheckin,
) {
  const [answers, setAnswers] = useState<CheckinAnswers>({
    legs: initial?.legs ?? null,
    sleepFeel: initial?.sleepFeel ?? null,
    soreness: initial?.soreness ?? null,
    stress: initial?.stress ?? null,
  });
  const [savedAt, setSavedAt] = useState(initial?.updatedAt ?? null);
  const [, start] = useTransition();

  function answer(input: CheckinField) {
    const before = answers;
    setAnswers((current) => ({ ...current, [input.field]: input.value }));
    start(async () => {
      const result = await save(input);
      if (result.status === "saved") {
        setSavedAt(result.updatedAt);
        return;
      }
      setAnswers(before);
      toast.error(errors[result.status], { id: "checkin" });
    });
  }

  return { answers, savedAt, answer };
}

export function CheckinQuestions({
  answers,
  onAnswer,
  idPrefix,
}: {
  answers: CheckinAnswers;
  onAnswer: (input: CheckinField) => void;
  idPrefix: string;
}) {
  return questions.map((question) => (
    <div key={question.field} className="flex flex-col gap-1.5">
      <span
        id={`${idPrefix}-${question.field}`}
        className="text-label text-secondary-foreground"
      >
        {question.label}
      </span>
      <ToggleGroup
        type="single"
        variant="choice"
        aria-labelledby={`${idPrefix}-${question.field}`}
        value={answers[question.field] ?? ""}
        onValueChange={(value) => {
          if (value) onAnswer({ field: question.field, value } as CheckinField);
        }}
        className="grid grid-cols-3 gap-1.5"
      >
        {question.options.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className="max-md:min-h-control-touch"
          >
            {(question.labels as Record<string, string>)[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  ));
}
