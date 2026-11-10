import Link from "next/link";
import { Chip } from "@/components/stride/chip";
import type { Zone } from "@/components/stride/session-blocks";
import { cn } from "@/lib/utils";

export type SessionRowState = "done" | "today" | "upcoming" | "rest";

export const sessionStateLabels: Record<SessionRowState, string> = {
  done: "Faite",
  today: "Aujourd’hui",
  upcoming: "À venir",
  rest: "Repos",
};

export function SessionStateMark({
  state,
  className,
}: {
  state: SessionRowState;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-state={state}
      className={cn(
        "size-3.5 shrink-0 rounded-full border-[1.5px]",
        state === "done" && "border-primary bg-primary",
        state === "today" &&
          "border-warning bg-[linear-gradient(90deg,transparent_50%,var(--warning)_50%)]",
        state === "upcoming" && "border-muted-foreground",
        state === "rest" && "border-dashed border-control-border",
        className,
      )}
    />
  );
}

export function SessionRow({
  state,
  past = false,
  selected = false,
  day,
  title,
  intensity,
  duration,
  distance,
  href,
  className,
}: {
  state: SessionRowState;
  past?: boolean;
  selected?: boolean;
  day: React.ReactNode;
  title: React.ReactNode;
  intensity?: { level: Zone; label: string };
  duration?: React.ReactNode;
  distance?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const cells = (
    <>
      <SessionStateMark state={state} />
      <span className="sr-only">{sessionStateLabels[state]}</span>
      <span className="text-label text-muted-foreground tabular-nums">
        {day}
      </span>
      <span className="min-w-0 truncate font-medium">{title}</span>
      <span className="max-sm:hidden">
        {intensity && (
          <Chip intensity={intensity.level}>{intensity.label}</Chip>
        )}
      </span>
      <span className="text-right tabular-nums">{duration ?? "–"}</span>
      <span className="text-right tabular-nums max-sm:hidden">
        {distance ?? "–"}
      </span>
    </>
  );
  const layout =
    "grid min-h-row-touch grid-cols-[14px_48px_minmax(0,1fr)_56px] items-center gap-3 px-3 sm:min-h-row sm:grid-cols-[14px_52px_minmax(0,1fr)_100px_60px_60px]";
  return (
    <li
      data-slot="session-row"
      data-state={state}
      className={cn(
        "border-b border-border last:border-b-0",
        past && "opacity-55",
        (state === "today" || selected) && "bg-muted",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-current={selected ? "true" : undefined}
          className={cn(
            layout,
            "transition-colors duration-150 ease-stride hover:bg-muted",
          )}
        >
          {cells}
        </Link>
      ) : (
        <div className={layout}>{cells}</div>
      )}
    </li>
  );
}

export function SessionList({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="session-list"
      className={cn(
        "overflow-hidden rounded-xl border border-border",
        className,
      )}
      {...props}
    />
  );
}
