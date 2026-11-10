"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SourceMark } from "@/components/stride/marks";
import {
  feelLabels,
  feelValues,
  type FeelValue,
} from "@/features/plans/debrief/debrief";
import type { DebriefFeelingView } from "@/features/plans/debrief/view";
import type { DebriefFeeling } from "@/features/plans/debrief/debrief";
import { saveActivityFeeling } from "@/server/activities/actions";

const errors = {
  invalid: "Ce ressenti n’est pas valide.",
  error: "Enregistrement impossible. Réessaie dans un instant.",
  "session-expired": "Ta session a expiré. Reconnecte-toi pour enregistrer.",
} as const;

const efforts = Array.from({ length: 10 }, (_, index) => index + 1);

export function FeelingPrompt({
  activityId,
  initial = null,
  compact = false,
  inline = false,
  strength = false,
  onSaved,
}: {
  activityId: string;
  initial?: { effort: number | null; feel: FeelValue | null } | null;
  compact?: boolean;
  inline?: boolean;
  strength?: boolean;
  onSaved?: () => void;
}) {
  const id = useId();
  const [effort, setEffort] = useState<number | null>(initial?.effort ?? null);
  const [feel, setFeel] = useState<FeelValue | null>(initial?.feel ?? null);
  const [pending, start] = useTransition();

  function save(nextEffort: number | null, value: FeelValue) {
    if (nextEffort === null) return;
    const before = { effort, feel };
    setEffort(nextEffort);
    setFeel(value);
    start(async () => {
      const result = await saveActivityFeeling({
        activityId,
        effort: nextEffort,
        feel: value,
      });
      if (result.status === "saved") {
        toast.success("Ressenti enregistré.", { id: `feeling-${activityId}` });
        onSaved?.();
        return;
      }
      setEffort(before.effort);
      setFeel(before.feel);
      toast.error(errors[result.status], { id: `feeling-${activityId}` });
    });
  }

  const showFeel = !compact || effort !== null;
  if (inline)
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5">
          <span id={`${id}-title`} className="text-body font-semibold">
            {strength ? "Effort de la séance" : "Comment c’était ?"}{" "}
            <span className="font-normal text-muted-foreground">
              {strength
                ? "de 1 à 10 · compte dans ta charge de renfo"
                : "Effort perçu, de 1 à 10"}
            </span>
          </span>
          <ToggleGroup
            type="single"
            variant="choice"
            aria-label={
              strength
                ? "Effort de la séance, de 1 à 10"
                : "Effort perçu, de 1 à 10"
            }
            value={effort === null ? "" : String(effort)}
            disabled={pending}
            onValueChange={(value) => {
              const next = Number(value);
              if (!efforts.includes(next)) return;
              if (feel === null) setEffort(next);
              else save(next, feel);
            }}
            className="grid grid-cols-5 gap-1 sm:grid-cols-10"
          >
            {efforts.map((value) => (
              <ToggleGroupItem
                key={value}
                value={String(value)}
                className="min-h-10 rounded-md px-0 text-body-lg tabular-nums sm:min-h-8"
              >
                {value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {effort !== null && (
          <div className="flex flex-col gap-1.5">
            <span
              id={`${id}-feel`}
              className="text-body text-secondary-foreground"
            >
              Sensations
            </span>
            <ToggleGroup
              type="single"
              variant="choice"
              aria-labelledby={`${id}-feel`}
              value={feel === null ? "" : String(feel)}
              disabled={pending}
              onValueChange={(value) => {
                const next = feelValues.find((item) => String(item) === value);
                if (next !== undefined) save(effort, next);
              }}
              className="grid grid-cols-5 gap-1"
            >
              {feelValues.map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={String(value)}
                  className="min-h-10 rounded-md px-1 text-label whitespace-normal sm:min-h-8"
                >
                  {feelLabels[value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.75">
        <span id={`${id}-title`} className="text-body-lg font-semibold">
          {compact
            ? "Comment c’était ? Effort perçu, de 1 à 10"
            : "Comment c’était ?"}
        </span>
        <p className="text-label text-muted-foreground">
          {initial
            ? "Change ton effort ou tes sensations, c’est enregistré aussitôt."
            : compact
              ? "Ta montre n’a rien enregistré. Tes sensations juste après."
              : "Ta montre n’a pas enregistré de ressenti. Deux choix et c’est noté."}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {!compact && (
          <span
            id={`${id}-effort`}
            className="text-body text-secondary-foreground"
          >
            Effort perçu, de 1 à 10
          </span>
        )}
        <ToggleGroup
          type="single"
          variant="choice"
          aria-labelledby={compact ? `${id}-title` : `${id}-effort`}
          value={effort === null ? "" : String(effort)}
          disabled={pending}
          onValueChange={(value) => {
            const next = Number(value);
            if (!efforts.includes(next)) return;
            if (feel === null) setEffort(next);
            else save(next, feel);
          }}
          className="grid grid-cols-5 gap-1.5"
        >
          {efforts.map((value) => (
            <ToggleGroupItem
              key={value}
              value={String(value)}
              className="min-h-11 px-0 text-title tabular-nums"
            >
              {value}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="flex justify-between text-label text-muted-foreground">
          <span>Très facile</span>
          <span>Maximal</span>
        </span>
      </div>
      {showFeel && (
        <div className="flex flex-col gap-1.5">
          <span
            id={`${id}-feel`}
            className="text-body text-secondary-foreground"
          >
            Sensations
          </span>
          <ToggleGroup
            type="single"
            variant="choice"
            aria-labelledby={`${id}-feel`}
            value={feel === null ? "" : String(feel)}
            disabled={pending || effort === null}
            onValueChange={(value) => {
              const next = feelValues.find((item) => String(item) === value);
              if (next !== undefined) save(effort, next);
            }}
            className="grid grid-cols-5 gap-1.5"
          >
            {feelValues.map((value) => (
              <ToggleGroupItem
                key={value}
                value={String(value)}
                className="min-h-11 px-1 text-label whitespace-normal"
              >
                {feelLabels[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}

export function DebriefFeeling({
  activityId,
  feeling,
}: {
  activityId: string;
  feeling: DebriefFeelingView | null;
}) {
  const [editing, setEditing] = useState(false);
  if (!feeling || editing)
    return (
      <section
        aria-label="Ton ressenti"
        className="rounded-xl border border-control-border bg-card p-3.5"
      >
        <FeelingPrompt
          activityId={activityId}
          initial={feeling?.value ?? null}
          onSaved={() => setEditing(false)}
        />
      </section>
    );
  const garmin = feeling.source === "garmin";
  return (
    <section
      aria-labelledby={`feeling-${activityId}`}
      className="flex flex-col gap-2.5"
    >
      <div className="flex items-center gap-2.5">
        <h3
          id={`feeling-${activityId}`}
          className="text-label font-medium text-muted-foreground"
        >
          Ton ressenti
        </h3>
        <span className="ml-auto inline-flex items-center gap-1.5 text-label text-muted-foreground">
          {garmin && !feeling.sessionWide && <SourceMark source="provider" />}
          {feeling.sourceLabel}
        </span>
      </div>
      {garmin ? (
        <dl className="grid grid-cols-2 gap-2.5">
          {feeling.effort && (
            <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-3.5 py-3">
              <dt className="order-2 text-label text-muted-foreground">
                {feeling.effortLabel}
              </dt>
              <dd className="order-1 text-metric font-semibold tabular-nums">
                {feeling.effort}
              </dd>
            </div>
          )}
          {feeling.feel && (
            <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-3.5 py-3">
              <dt className="order-2 text-label text-muted-foreground">
                Sensations
              </dt>
              <dd className="order-1 text-title font-semibold">
                {feeling.feel}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="flex items-baseline gap-2.5">
              {feeling.effort && (
                <span className="text-metric font-semibold tabular-nums">
                  {feeling.effort}
                </span>
              )}
              {feeling.feel && (
                <span className="text-body-lg font-semibold">
                  {feeling.feel}
                </span>
              )}
            </span>
            <span className="text-label text-muted-foreground">
              Effort perçu · sensations
            </span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="max-sm:min-h-11"
            onClick={() => setEditing(true)}
          >
            Modifier
          </Button>
        </div>
      )}
    </section>
  );
}

export function CardFeeling({
  activityId,
  feeling,
  strength = false,
}: {
  activityId: string;
  feeling: DebriefFeeling | null;
  strength?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (!feeling || editing)
    return (
      <FeelingPrompt
        activityId={activityId}
        inline
        strength={strength}
        initial={
          feeling ? { effort: feeling.effort, feel: feeling.feel } : null
        }
        onSaved={() => setEditing(false)}
      />
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-body text-secondary-foreground">
      Ressenti
      {feeling.effort !== null && (
        <span className="text-body-lg font-semibold text-foreground tabular-nums">
          {feeling.effort}/10
        </span>
      )}
      {feeling.feel !== null && (
        <span>
          {feeling.effort !== null && "· "}
          {feelLabels[feeling.feel]}
        </span>
      )}
      {feeling.source === "garmin" ? (
        <span className="text-label text-muted-foreground">
          · saisi sur ta montre
        </span>
      ) : (
        <button
          type="button"
          className="min-h-8 text-label text-muted-foreground underline underline-offset-3 hover:text-foreground"
          onClick={() => setEditing(true)}
        >
          Modifier
        </button>
      )}
    </span>
  );
}
