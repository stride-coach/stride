"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ChartNoAxesColumnIcon,
  CircleCheckIcon,
  CircleIcon,
  FlagIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatClock } from "../format";
import {
  checkinSummary,
  raceDayView,
  type RaceDayCheckin,
  type RaceDayPlan,
  type RaceDayRow,
} from "../race-day";
import { localDate, localMinutes, zonedEpoch } from "../sun";

const tick = 15_000;

function subscribeClock(callback: () => void) {
  const timer = window.setInterval(callback, tick);
  document.addEventListener("visibilitychange", callback);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", callback);
  };
}

function readClock() {
  return Math.floor(Date.now() / tick) * tick;
}

function subscribeNetwork(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function checkinLabel(next: { name: string; kind: string }) {
  if (next.kind === "finish") return "Je suis à l’arrivée";
  if (next.kind === "water") return `Je suis au point d’eau de ${next.name}`;
  return `Je suis au ravito de ${next.name}`;
}

async function sendCheckin(raceId: string, checkin: RaceDayCheckin) {
  const response = await fetch(`/api/races/${raceId}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkin),
  }).catch(() => null);
  if (!response?.ok)
    toast.error("Pointage gardé ici, mais pas encore envoyé à Stride.");
}

function Rows({ rows }: { rows: RaceDayRow[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-end justify-between gap-3 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-label text-muted-foreground">{row.label}</dt>
            <dd className="text-body-lg font-semibold text-pretty tabular-nums">
              {row.value}
            </dd>
          </div>
          {row.aside && (
            <dd className="shrink-0 text-body text-secondary-foreground tabular-nums">
              {row.aside}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

function CheckinSheet({
  plan,
  checkin,
  onChange,
  onClose,
}: {
  plan: RaceDayPlan;
  checkin: RaceDayCheckin;
  onChange: (checkin: RaceDayCheckin) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const summary = checkinSummary(plan, checkin.waypointId, checkin.checkedAt);
  if (!summary) return null;
  const minutes = localMinutes(checkin.checkedAt, plan.timeZone);
  const correct = (value: string) => {
    const [hours, rest] = value.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(rest)) return;
    const day = localDate(checkin.checkedAt, plan.timeZone);
    onChange({
      ...checkin,
      checkedAt: zonedEpoch(day, hours * 60 + rest, plan.timeZone),
    });
  };
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-border">
          <SheetTitle className="text-body font-semibold">
            {summary.title}
          </SheetTitle>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="sm">
              Fermer
            </Button>
          </SheetClose>
          <SheetDescription className="sr-only">
            Ton pointage recale la suite du plan.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-label text-muted-foreground">Pointé à</span>
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-display font-semibold tabular-nums">
                {summary.checked}
              </span>
              <span className="text-body text-secondary-foreground">
                {summary.planned}
              </span>
            </p>
            {editing ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="checkin-time" className="sr-only">
                  Heure de passage
                </Label>
                <Input
                  id="checkin-time"
                  type="time"
                  defaultValue={formatClock(minutes)}
                  onChange={(event) => correct(event.target.value)}
                  className="w-32 tabular-nums"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-fit text-body text-primary underline-offset-2 hover:underline"
              >
                Corriger l’heure
              </button>
            )}
          </div>
          <dl className="flex flex-col border-y border-border py-1">
            {summary.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <dt>{row.label}</dt>
                <dd className="font-semibold tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
          {summary.todo.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-label text-muted-foreground">
                À faire à ce ravito
              </h3>
              <ul className="flex flex-col">
                {summary.todo.map((item, index) => {
                  const id = `todo-${index}`;
                  const checked = done.has(item);
                  return (
                    <li
                      key={item}
                      className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(value) =>
                          setDone((current) => {
                            const next = new Set(current);
                            if (value === true) next.add(item);
                            else next.delete(item);
                            return next;
                          })
                        }
                      />
                      <Label
                        htmlFor={id}
                        className={cn(
                          "font-normal",
                          checked && "text-muted-foreground",
                        )}
                      >
                        {item}
                      </Label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetClose asChild>
            <Button type="button" size="lg" className="w-full">
              Je repars
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function RaceDay({
  plan,
  checkins: initial,
  renderedAt,
}: {
  plan: RaceDayPlan;
  checkins: RaceDayCheckin[];
  renderedAt: number;
}) {
  const now = useSyncExternalStore(subscribeClock, readClock, () => renderedAt);
  const online = useSyncExternalStore(
    subscribeNetwork,
    () => navigator.onLine,
    () => true,
  );
  const [checkins, setCheckins] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const view = raceDayView(plan, checkins, now);
  const current = checkins.find((item) => item.waypointId === open) ?? null;

  const save = (checkin: RaceDayCheckin) => {
    setCheckins((items) => [
      ...items.filter((item) => item.waypointId !== checkin.waypointId),
      checkin,
    ]);
    void sendCheckin(plan.raceId, checkin);
  };

  function checkIn() {
    const next = view.next;
    if (!next) return;
    save({ waypointId: next.id, checkedAt: new Date().getTime() });
    setOpen(next.id);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <p className="flex items-center gap-2 border-b border-border pb-2.5 text-label text-muted-foreground">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            online ? "bg-primary" : "bg-muted-foreground",
          )}
        />
        <span className="font-medium text-foreground">
          {online ? "En ligne" : "Hors ligne"}
        </span>
        <span className="ml-auto tabular-nums">
          {formatClock(localMinutes(now, plan.timeZone))}
        </span>
      </p>
      <header className="flex flex-col gap-1">
        <p className="text-label text-muted-foreground">{view.eyebrow}</p>
        <h1 className="text-title font-semibold text-balance">{view.title}</h1>
        <p className="text-body text-secondary-foreground tabular-nums">
          {view.detail}
        </p>
      </header>
      {view.rows.length > 0 && (
        <Widget
          headingLevel={2}
          icon={<FlagIcon />}
          aria-labelledby="race-day-now"
          title={
            <span id="race-day-now">
              {view.phase === "before" ? "Avant le départ" : "Maintenant"}
            </span>
          }
          verdict={
            <span className="text-label font-normal text-muted-foreground">
              {view.updated}
            </span>
          }
        >
          <Rows rows={view.rows} />
        </Widget>
      )}
      {view.next && view.phase === "racing" && (
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-body-lg font-semibold"
          onClick={checkIn}
        >
          {checkinLabel(view.next)}
        </Button>
      )}
      <Widget
        headingLevel={2}
        icon={<ChartNoAxesColumnIcon />}
        aria-labelledby="race-day-passages"
        title={<span id="race-day-passages">Tes passages</span>}
        verdict={
          <span className="text-label font-normal text-muted-foreground">
            tu pointes à chaque ravito
          </span>
        }
      >
        <ol className="flex flex-col">
          {view.passages.map((passage) => (
            <li
              key={passage.id}
              className="flex items-center gap-3 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0"
            >
              {passage.checked ? (
                <CircleCheckIcon
                  aria-label="Pointé"
                  className="size-4 shrink-0 text-primary"
                />
              ) : (
                <CircleIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "font-medium",
                    passage.checked && "text-secondary-foreground",
                  )}
                >
                  {passage.name}
                </span>
                <span className="text-label text-muted-foreground tabular-nums">
                  {passage.detail}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  passage.checked
                    ? "text-secondary-foreground"
                    : "font-semibold",
                )}
              >
                {passage.value}
              </span>
            </li>
          ))}
        </ol>
      </Widget>
      <p className="text-label text-pretty text-muted-foreground">
        Stride ne suit pas ta position pendant la course. Il recale le plan
        chaque fois que tu pointes, et la montre garde les alertes.
      </p>
      {current && (
        <CheckinSheet
          key={current.waypointId}
          plan={plan}
          checkin={current}
          onChange={save}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
