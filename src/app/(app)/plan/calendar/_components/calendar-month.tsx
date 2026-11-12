"use client";

import { useRef, useState } from "react";
import { Chip } from "@/components/stride/chip";
import { SessionList, SessionRow } from "@/components/stride/session-row";
import { zoneFills } from "@/components/stride/session-shape";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import type {
  CalendarDay,
  CalendarMonth,
  CalendarSession,
} from "@/features/plans/view/calendar";
import { familyLabels } from "@/features/plans/view/program";
import { cn } from "@/lib/utils";
import { rowState } from "../../_components/program-week";
import { markSessionOpened } from "../../_components/session-sheet";

const weekdays = [
  { short: "Lun.", letter: "L", name: "lundi" },
  { short: "Mar.", letter: "M", name: "mardi" },
  { short: "Mer.", letter: "M", name: "mercredi" },
  { short: "Jeu.", letter: "J", name: "jeudi" },
  { short: "Ven.", letter: "V", name: "vendredi" },
  { short: "Sam.", letter: "S", name: "samedi" },
  { short: "Dim.", letter: "D", name: "dimanche" },
];

function sessionLabel(session: CalendarSession) {
  return session.family === "race"
    ? session.title
    : familyLabels[session.family];
}

function isDone(session: CalendarSession) {
  return session.state === "done" || session.state === "partial";
}

function sessionDetail(session: CalendarSession) {
  return [session.duration, isDone(session) ? "fait" : null]
    .filter(Boolean)
    .join(" · ");
}

function dotClass(session: CalendarSession) {
  if (session.family === "race") return "bg-primary";
  return session.zone ? zoneFills[session.zone] : "bg-control-border";
}

function dayDescription(day: CalendarDay) {
  const sessions = day.sessions.map((session) =>
    [sessionLabel(session), sessionDetail(session)].filter(Boolean).join(" "),
  );
  return [
    day.label,
    day.isToday ? "aujourd’hui" : null,
    ...(day.rest ? ["repos"] : sessions),
  ]
    .filter(Boolean)
    .join(", ");
}

function sessionHref(month: string, session: CalendarSession) {
  if (session.raceId) return `/races/${session.raceId}`;
  const query = new URLSearchParams({ month, session: session.sessionKey });
  if (session.planId) query.set("plan", session.planId);
  return `/plan/calendar?${query}`;
}

function defaultIndex(days: CalendarDay[]) {
  const today = days.findIndex((day) => day.isToday);
  return today >= 0
    ? today
    : Math.max(
        days.findIndex((day) => day.inMonth),
        0,
      );
}

function useRovingGrid(days: CalendarDay[]) {
  const [active, setActive] = useState(() => defaultIndex(days));
  const cells = useRef<(HTMLElement | null)[]>([]);
  function move(index: number) {
    const next = Math.min(Math.max(index, 0), days.length - 1);
    setActive(next);
    cells.current[next]?.focus();
  }
  function onKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    index: number,
    activate: () => void,
  ) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const column = index % 7;
    switch (event.key) {
      case "ArrowLeft":
        move(index - 1);
        break;
      case "ArrowRight":
        move(index + 1);
        break;
      case "ArrowUp":
        move(index - 7);
        break;
      case "ArrowDown":
        move(index + 7);
        break;
      case "Home":
        move(index - column);
        break;
      case "End":
        move(index - column + 6);
        break;
      case "Enter":
      case " ":
        if (event.target !== event.currentTarget) return;
        activate();
        break;
      default:
        return;
    }
    event.preventDefault();
  }
  return { active, setActive, cells, onKeyDown };
}

function DesktopGrid({ calendar }: { calendar: CalendarMonth }) {
  const days = calendar.weeks.flatMap((week) => week.days);
  const { active, setActive, cells, onKeyDown } = useRovingGrid(days);
  return (
    <div
      role="grid"
      aria-labelledby="calendar-title"
      className="flex flex-col max-md:hidden"
    >
      <div role="row" className="grid grid-cols-7 border-b border-border">
        {weekdays.map((weekday) => (
          <div
            key={weekday.name}
            role="columnheader"
            aria-label={weekday.name}
            className="px-2.5 py-2 text-label text-muted-foreground"
          >
            {weekday.short}
          </div>
        ))}
      </div>
      {calendar.weeks.map((week, row) => (
        <div
          key={week.weekStart}
          role="row"
          className="grid grid-cols-7 border-b border-border"
        >
          {week.days.map((day, column) => {
            const index = row * 7 + column;
            return (
              <div
                key={day.date}
                ref={(node) => {
                  cells.current[index] = node;
                }}
                role="gridcell"
                tabIndex={index === active ? 0 : -1}
                aria-label={dayDescription(day)}
                aria-current={day.isToday ? "date" : undefined}
                onFocus={() => setActive(index)}
                onKeyDown={(event) =>
                  onKeyDown(event, index, () =>
                    event.currentTarget.querySelector("a")?.click(),
                  )
                }
                className={cn(
                  "flex min-h-30 min-w-0 flex-col gap-1.5 border-border px-2.5 py-2 not-last:border-r focus-visible:outline-offset-[-2px]",
                  day.isToday && "bg-muted",
                  !day.inMonth && "opacity-45",
                )}
              >
                <span
                  className={cn(
                    "text-label tabular-nums",
                    day.isToday
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {day.dayNumber}
                  {day.isToday && " · aujourd’hui"}
                </span>
                {day.rest && (
                  <span className="text-body text-muted-foreground">Repos</span>
                )}
                {day.sessions.map((session) => (
                  <Link
                    key={session.sessionKey}
                    href={sessionHref(calendar.month, session)}
                    onClick={session.raceId ? undefined : markSessionOpened}
                    data-session-key={session.sessionKey}
                    tabIndex={-1}
                    className="flex min-w-0 flex-col gap-0.5 rounded-md hover:bg-muted data-panel-source:bg-muted"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.75 shrink-0 rounded-mark",
                          dotClass(session),
                        )}
                      />
                      <span
                        className={cn(
                          "truncate text-body font-medium",
                          isDone(session) && "text-secondary-foreground",
                        )}
                      >
                        {sessionLabel(session)}
                      </span>
                    </span>
                    {sessionDetail(session) && (
                      <span className="pl-3.25 text-label text-muted-foreground tabular-nums">
                        {sessionDetail(session)}
                      </span>
                    )}
                    {session.state === "proposed" && (
                      <Chip proposal className="w-fit">
                        Proposition
                      </Chip>
                    )}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MobileGrid({ calendar }: { calendar: CalendarMonth }) {
  const days = calendar.weeks.flatMap((week) => week.days);
  const { active, setActive, cells, onKeyDown } = useRovingGrid(days);
  const [selected, setSelected] = useState(() => days[defaultIndex(days)]);
  const week =
    calendar.weeks.find((item) =>
      item.days.some((day) => day.date === selected.date),
    ) ?? calendar.weeks[0];
  function select(index: number) {
    setActive(index);
    setSelected(days[index]);
  }
  return (
    <div className="flex flex-col md:hidden">
      <div role="grid" aria-labelledby="calendar-title" className="px-2">
        <div role="row" className="grid grid-cols-7">
          {weekdays.map((weekday) => (
            <div
              key={weekday.name}
              role="columnheader"
              aria-label={weekday.name}
              className="py-2 text-center text-label text-muted-foreground"
            >
              {weekday.letter}
            </div>
          ))}
        </div>
        {calendar.weeks.map((row, rowIndex) => (
          <div
            key={row.weekStart}
            role="row"
            className="grid grid-cols-7 border-t border-border"
          >
            {row.days.map((day, column) => {
              const index = rowIndex * 7 + column;
              return (
                <div
                  key={day.date}
                  ref={(node) => {
                    cells.current[index] = node;
                  }}
                  role="gridcell"
                  tabIndex={index === active ? 0 : -1}
                  aria-label={dayDescription(day)}
                  aria-selected={day.date === selected.date}
                  aria-current={day.isToday ? "date" : undefined}
                  onFocus={() => setActive(index)}
                  onClick={() => select(index)}
                  onKeyDown={(event) =>
                    onKeyDown(event, index, () => select(index))
                  }
                  className={cn(
                    "flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-md text-body tabular-nums focus-visible:outline-offset-[-2px]",
                    day.date === selected.date && "bg-muted",
                    day.isToday ? "font-semibold" : "text-secondary-foreground",
                    !day.inMonth && "opacity-45",
                  )}
                >
                  {day.dayNumber}
                  <span aria-hidden="true" className="flex h-1.25 gap-0.5">
                    {day.sessions.slice(0, 2).map((session) => (
                      <span
                        key={session.sessionKey}
                        className={cn(
                          "size-1.25 rounded-mark",
                          dotClass(session),
                          isDone(session) && "opacity-55",
                        )}
                      />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <section aria-labelledby="calendar-week" className="mt-2">
        <h2
          id="calendar-week"
          className="border-y border-border bg-muted px-4 py-2 text-label text-secondary-foreground"
        >
          {week.label}
        </h2>
        <SessionList className="rounded-none border-0">
          {week.days.flatMap((day, column) => {
            if (!day.inPlan) return [];
            const sessions = day.sessions.length > 0 ? day.sessions : [null];
            return sessions.map((session) => (
              <SessionRow
                key={session?.sessionKey ?? day.date}
                state={rowState(day, session?.state ?? null, !session)}
                past={day.isPast && !day.isToday}
                day={`${weekdays[column].short.replace(".", "")} ${day.dayNumber}`}
                title={session ? session.title : "Repos"}
                duration={
                  session?.family === "race"
                    ? undefined
                    : (session?.duration ?? undefined)
                }
                href={
                  session ? sessionHref(calendar.month, session) : undefined
                }
                sessionKey={session?.sessionKey}
                onClick={
                  session && !session.raceId ? markSessionOpened : undefined
                }
                className="px-1"
              />
            ));
          })}
        </SessionList>
      </section>
    </div>
  );
}

export function CalendarMonthView({ calendar }: { calendar: CalendarMonth }) {
  return (
    <>
      <DesktopGrid calendar={calendar} />
      <MobileGrid calendar={calendar} />
    </>
  );
}
