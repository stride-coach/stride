"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeelingPrompt } from "@/features/activities/components/feeling-prompt";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { PairQuestionCard } from "@/features/gear/components/activity-pair";
import { cn } from "@/lib/utils";
import { queueNext, queueOrder } from "../queue";
import type { TodayActivity, TodayQueueItem } from "../today";
import { LegsCheckin } from "./legs-checkin";

function ActivityRow({ activity }: { activity: TodayActivity }) {
  return (
    <Link
      href={activity.href}
      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors duration-150 ease-stride hover:bg-muted"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-semibold">
          {activity.heading} · {activity.title}
        </span>
        <span className="truncate text-label text-muted-foreground">
          {activity.detail}
        </span>
      </span>
      {activity.compliance && (
        <span
          className={cn(
            "flex items-center gap-1.25 text-label whitespace-nowrap",
            activity.compliance.partial ? "text-warning" : "text-primary",
          )}
        >
          <CheckIcon aria-hidden="true" className="size-3" strokeWidth={2.5} />
          {activity.compliance.partial ? "En partie" : "Réussie"}
          {activity.compliance.pct !== null &&
            ` · ${activity.compliance.pct} %`}
        </span>
      )}
    </Link>
  );
}

function QueueItem({ item }: { item: TodayQueueItem }) {
  if (item.kind === "feeling")
    return (
      <>
        <ActivityRow activity={item.activity} />
        <FeelingPrompt activityId={item.activityId} compact />
      </>
    );
  if (item.kind === "pair")
    return (
      <>
        {item.activity && <ActivityRow activity={item.activity} />}
        <PairQuestionCard question={item.question} />
      </>
    );
  return <LegsCheckin initial={null} hint={item.hint} />;
}

export function TodayQueue({ items }: { items: TodayQueueItem[] }) {
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  if (items.length === 0) return null;
  const [current, ...rest] = queueOrder(items, currentKey);
  const position = items.indexOf(current) + 1;
  const next = queueNext(rest.map((item) => item.label));
  return (
    <section
      aria-labelledby="today-queue"
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex items-center gap-2.5">
        <h2
          id="today-queue"
          className="text-label font-medium text-muted-foreground"
        >
          À faire
        </h2>
        <span aria-hidden="true" className="flex items-center gap-1">
          {items.map((item) => (
            <span
              key={item.key}
              className={cn(
                "size-1.5 rounded-full",
                item === current ? "bg-primary" : "bg-control-border",
              )}
            />
          ))}
        </span>
        <span
          aria-live="polite"
          className="ml-auto text-label text-muted-foreground tabular-nums"
        >
          {position} sur {items.length}
        </span>
      </div>
      <QueueItem key={current.key} item={current} />
      {next && (
        <div className="flex items-center gap-2.5 text-label text-muted-foreground">
          <span className="flex-1">{next}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="max-sm:h-11"
            onClick={() => setCurrentKey(rest[0].key)}
          >
            Plus tard
          </Button>
        </div>
      )}
    </section>
  );
}
