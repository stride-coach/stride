"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveRacePlan } from "@/server/races/actions";
import { actionMessage } from "../messages";

export function ClimbThreshold({
  raceId,
  revision,
  threshold,
  options,
}: {
  raceId: string;
  revision: number | null;
  threshold: number;
  options: number[];
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(threshold);
  const latest = useRef(revision);
  useEffect(() => {
    latest.current = revision;
  }, [revision]);

  function choose(value: number, previous: number) {
    startTransition(async () => {
      setShown(value);
      const result = await saveRacePlan(raceId, latest.current, {
        walkGradePercent: value,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      if (value === previous) return;
      toast.success(`Marcher dès : ${value} %`, {
        id: "climb-threshold",
        duration: 10_000,
        action: {
          label: "Annuler",
          onClick: () => choose(previous, previous),
        },
      });
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const move = moves[event.key];
    if (move === undefined || pending) return;
    event.preventDefault();
    const group = event.currentTarget;
    const index = options.indexOf(shown);
    const next = options[(index + move + options.length) % options.length];
    choose(next, threshold);
    requestAnimationFrame(() =>
      group.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus(),
    );
  }

  return (
    <div
      onKeyDown={onKeyDown}
      role="radiogroup"
      aria-label="Marcher dès"
      aria-busy={pending || undefined}
      className="flex w-full gap-0.5 rounded-lg border border-border bg-card p-0.5 sm:w-fit"
    >
      {options.map((option) => {
        const checked = option === shown;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-value={option}
            disabled={pending}
            onClick={() => !checked && choose(option, threshold)}
            className={cn(
              "inline-flex min-h-control-touch flex-1 items-center justify-center rounded-md px-2 whitespace-nowrap text-muted-foreground tabular-nums transition-colors duration-150 ease-stride hover:text-foreground sm:flex-none sm:px-3 md:min-h-7",
              checked && "bg-muted font-medium text-foreground",
            )}
          >
            {option} %
          </button>
        );
      })}
    </div>
  );
}
