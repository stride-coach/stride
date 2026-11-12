"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WeekProposal } from "@/features/plans/review/proposal";
import {
  weekEyebrow,
  type MilestoneTone,
  type ProgramMilestone,
  type SeasonProgram,
} from "@/features/plans/view/program";
import { ProgramChart } from "./program-chart";
import { NextSeason, ProgramHeader, SeasonRaces } from "./program-hero";
import { ProgramWeekPanel } from "./program-week";
import type { WatchDayTag } from "@/features/garmin/watch";

const milestoneTones: Record<MilestoneTone, string> = {
  provider: "bg-foreground",
  accent: "bg-primary",
  terrain: "bg-intensity-3",
  quality: "bg-intensity-4",
  success: "bg-primary",
};

function typing(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function Milestones({
  milestones,
  onSelect,
}: {
  milestones: ProgramMilestone[];
  onSelect: (weekKey: string) => void;
}) {
  return (
    <section
      aria-labelledby="program-milestones"
      className="flex flex-col gap-1"
    >
      <h2
        id="program-milestones"
        className="text-label font-medium text-muted-foreground"
      >
        Repères du programme
      </h2>
      <ul className="flex flex-col">
        {milestones.map((milestone) => (
          <li key={milestone.key}>
            <button
              type="button"
              onClick={() => onSelect(milestone.weekKey)}
              className="grid w-full grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md py-1.5 text-left transition-colors duration-150 ease-stride hover:bg-muted"
            >
              <span className="text-label text-muted-foreground tabular-nums">
                S{milestone.number}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    milestoneTones[milestone.tone],
                  )}
                />
                <span className="truncate">{milestone.label}</span>
              </span>
              <span className="text-label whitespace-nowrap text-muted-foreground">
                {milestone.when}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProgramExplorer({
  program,
  initialWeekKey,
  proposals = {},
  watchTags = {},
}: {
  program: SeasonProgram;
  initialWeekKey: string | null;
  proposals?: Record<string, WeekProposal[]>;
  watchTags?: Record<string, WatchDayTag>;
}) {
  const { weeks } = program;
  const [selected, setSelected] = useState(
    initialWeekKey ?? program.defaultWeekKey,
  );
  const [requested, setRequested] = useState(initialWeekKey);
  if (requested !== initialWeekKey) {
    setRequested(initialWeekKey);
    if (initialWeekKey) setSelected(initialWeekKey);
  }
  const index = weeks.findIndex((week) => week.weekKey === selected);
  const week = weeks[index] ?? null;

  const select = useCallback(
    (weekKey: string) => {
      const target = weeks.find((item) => item.weekKey === weekKey);
      if (!target) return;
      setSelected(weekKey);
      const url = new URL(window.location.href);
      url.searchParams.set("week", target.weekStart);
      window.history.replaceState(null, "", url);
    },
    [weeks],
  );

  const step = useCallback(
    (offset: number) => {
      const next = weeks[index + offset];
      if (next) select(next.weekKey);
    },
    [weeks, index, select],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        typing(event.target)
      )
        return;
      if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step]);

  const navigation = (
    <div className="ml-auto flex items-center gap-1.5 max-sm:hidden">
      <span className="mr-1.5 text-label text-muted-foreground max-lg:hidden">
        ← → au clavier
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Semaine précédente"
        disabled={index <= 0}
        onClick={() => step(-1)}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      {program.status === "current" && program.defaultWeekKey && (
        <Button
          variant="outline"
          size="sm"
          aria-pressed={selected === program.defaultWeekKey}
          onClick={() => select(program.defaultWeekKey!)}
        >
          Aujourd’hui
        </Button>
      )}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Semaine suivante"
        disabled={index < 0 || index >= weeks.length - 1}
        onClick={() => step(1)}
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row xl:items-start">
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="sr-only">{program.title}</h1>
        <div className="px-4 pt-4.5 md:px-5">
          <ProgramChart
            weeks={weeks}
            bands={program.bands}
            selected={selected}
            onSelect={select}
          />
        </div>
        {week && (
          <ProgramWeekPanel
            week={week}
            watchTags={watchTags}
            navigation={navigation}
            sessionHref={(sessionKey) => {
              const query = new URLSearchParams();
              if (program.href !== "/plan") query.set("season", program.id);
              query.set("week", week.weekStart);
              if (week.planId) query.set("plan", week.planId);
              query.set("session", sessionKey);
              return `/plan?${query}`;
            }}
            proposals={proposals[week.weekStart]}
            reviewHref={(proposalId) => {
              const query = new URLSearchParams();
              if (program.href !== "/plan") query.set("season", program.id);
              query.set("week", week.weekStart);
              query.set("proposal", proposalId);
              return `/plan?${query}`;
            }}
          />
        )}
      </div>
      <aside
        aria-label="Programme"
        className="contents xl:flex xl:w-panel xl:shrink-0 xl:flex-col xl:gap-6 xl:self-stretch xl:border-l xl:border-border xl:px-5 xl:py-4.5"
      >
        <div className="border-b border-border px-4 py-4.5 max-xl:order-first md:px-5 xl:border-0 xl:p-0">
          <ProgramHeader
            program={program}
            eyebrow={
              week && selected !== program.defaultWeekKey
                ? weekEyebrow(week, weeks.length)
                : program.eyebrow
            }
          />
        </div>
        {program.milestones.length > 0 && (
          <div className="px-4 py-4.5 md:px-5 xl:p-0">
            <Milestones milestones={program.milestones} onSelect={select} />
          </div>
        )}
        {program.races.length > 0 && (
          <div className="px-4 py-4.5 md:px-5 xl:p-0">
            <SeasonRaces races={program.races} />
          </div>
        )}
        {program.next && (
          <div className="px-4 py-4.5 md:px-5 xl:p-0">
            <NextSeason season={program.next} />
          </div>
        )}
      </aside>
    </div>
  );
}
