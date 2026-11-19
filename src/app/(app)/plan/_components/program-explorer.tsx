"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WeekProposal } from "@/features/plans/review/proposal";
import {
  type MilestoneTone,
  type SeasonProgram,
} from "@/features/plans/view/program";
import { ProgramChart } from "./program-chart";
import { NextSeason, ProgramHeader } from "./program-hero";
import { LoadTrendWidget } from "@/features/progress/components/load-trend-widget";
import type { LoadTrend } from "@/features/progress/load-trend";
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

type Landmark = {
  key: string;
  weekKey: string;
  number: number;
  label: string;
  detail: string | null;
  when: string;
  tone: MilestoneTone;
};

function Milestones({
  title,
  landmarks,
  onSelect,
}: {
  title: string;
  landmarks: Landmark[];
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
        {title}
      </h2>
      <ul className="flex flex-col">
        {landmarks.map((landmark) => (
          <li
            key={landmark.key}
            className="border-t border-border first:border-0"
          >
            <button
              type="button"
              onClick={() => onSelect(landmark.weekKey)}
              className="grid w-full grid-cols-[30px_minmax(0,1fr)_auto] items-baseline gap-2.5 rounded-md py-2 text-left transition-colors duration-150 ease-stride hover:bg-muted"
            >
              <span className="text-label text-muted-foreground tabular-nums">
                S{landmark.number}
              </span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      milestoneTones[landmark.tone],
                    )}
                  />
                  <span className="truncate font-medium">{landmark.label}</span>
                </span>
                {landmark.detail && (
                  <span className="truncate text-label text-muted-foreground tabular-nums">
                    {landmark.detail}
                  </span>
                )}
              </span>
              <span className="text-label whitespace-nowrap text-muted-foreground tabular-nums">
                {landmark.when}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function landmarksOf(program: SeasonProgram): Landmark[] {
  const fromWeeks = new Map(program.weeks.map((week) => [week.number, week]));
  const past = program.status === "past";
  return [
    ...(past ? [] : program.milestones).map((item) => ({
      ...item,
      detail: null,
    })),
    ...program.races.flatMap((race) => {
      const week = fromWeeks.get(race.number);
      return week
        ? [
            {
              key: `race-${race.raceId}`,
              weekKey: week.weekKey,
              number: race.number,
              label: race.name,
              detail: race.detail,
              when: race.when,
              tone: "provider" as const,
            },
          ]
        : [];
    }),
  ].sort((first, second) => first.number - second.number);
}

export function ProgramExplorer({
  program,
  initialWeekKey,
  proposals = {},
  watchTags = {},
  load = null,
  today = null,
  mobileAction,
}: {
  today?: string | null;
  load?: LoadTrend | null;
  mobileAction?: React.ReactNode;
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
  const landmarks = landmarksOf(program);
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
        {program.status === "past" && (
          <div className="border-b border-border px-4 py-3 xl:hidden">
            <ProgramHeader program={program} compact />
          </div>
        )}
        <div className="px-4 pt-4.5 md:px-5">
          <ProgramChart
            weeks={weeks}
            past={program.status === "past"}
            today={today}
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
        className="flex flex-col xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
      >
        <div
          className={cn(
            "border-b border-border px-4 py-4.5 md:px-5",
            program.status === "past" && "max-xl:hidden",
          )}
        >
          <ProgramHeader program={program} />
        </div>
        {load && (
          <div className="border-b border-border p-3">
            <LoadTrendWidget load={load} />
          </div>
        )}
        {landmarks.length > 0 && (
          <div className="border-b border-border px-4 py-4.5 md:px-5">
            <Milestones
              title={
                program.status === "past" ? "Courses de la saison" : "Jalons"
              }
              landmarks={landmarks}
              onSelect={select}
            />
          </div>
        )}
        {program.next && (
          <div className="px-4 py-4.5 md:px-5">
            <NextSeason season={program.next} />
          </div>
        )}
        {mobileAction && (
          <div className="flex justify-center px-4 pb-4.5 md:hidden">
            {mobileAction}
          </div>
        )}
      </aside>
    </div>
  );
}
