import Link from "next/link";
import { Chip } from "@/components/stride/chip";
import type { Zone } from "@/components/stride/session-blocks";
import { cn } from "@/lib/utils";

export type SessionRowState =
  "done" | "partial" | "today" | "upcoming" | "missed" | "proposed" | "rest";

export const sessionStateLabels: Record<SessionRowState, string> = {
  done: "Faite",
  partial: "Faite en partie",
  today: "Aujourd’hui",
  upcoming: "À venir",
  missed: "Non faite",
  proposed: "Changement proposé",
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
        state === "partial" &&
          "border-primary bg-[linear-gradient(0deg,var(--primary)_50%,transparent_50%)]",
        state === "missed" && "border-destructive",
        state === "proposed" && "border-dashed border-warning",
        state === "today" &&
          "border-warning bg-[linear-gradient(90deg,transparent_50%,var(--warning)_50%)]",
        state === "upcoming" && "border-muted-foreground",
        state === "rest" && "border-dashed border-control-border",
        className,
      )}
    />
  );
}

export function MissingValue({ value }: { value?: React.ReactNode }) {
  if (value !== undefined && value !== null) return value;
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="sr-only">non renseigné</span>
    </>
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
  elevation,
  compliance,
  href,
  label,
  current,
  className,
  sessionKey,
  onClick,
}: {
  sessionKey?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  state: SessionRowState;
  past?: boolean;
  selected?: boolean;
  day: React.ReactNode;
  title: React.ReactNode;
  intensity?: { level?: Zone | null; label: string } | null;
  duration?: React.ReactNode;
  distance?: React.ReactNode;
  elevation?: React.ReactNode;
  compliance?: React.ReactNode;
  href?: string;
  label?: string;
  current?: "date" | "page";
  className?: string;
}) {
  const extended = elevation !== undefined || compliance !== undefined;
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
          <Chip intensity={intensity.level ?? undefined}>
            {intensity.label}
          </Chip>
        )}
      </span>
      <span className="text-right tabular-nums">
        <MissingValue value={duration} />
      </span>
      <span className="text-right tabular-nums max-sm:hidden">
        <MissingValue value={distance} />
      </span>
      {extended && (
        <>
          <span className="text-right text-muted-foreground tabular-nums max-lg:hidden">
            {elevation}
          </span>
          <span className="text-right tabular-nums max-lg:hidden">
            {compliance}
          </span>
        </>
      )}
    </>
  );
  const layout = cn(
    "grid min-h-row-touch grid-cols-[14px_48px_minmax(0,1fr)_56px] items-center gap-3 px-3 sm:min-h-row sm:grid-cols-[14px_52px_minmax(0,1fr)_104px_60px_62px]",
    extended &&
      "lg:grid-cols-[14px_52px_minmax(0,1fr)_104px_60px_62px_62px_44px]",
  );
  return (
    <li
      data-slot="session-row"
      data-state={state}
      aria-current={current ?? (selected && !href ? "true" : undefined)}
      className={cn(
        "border-b border-border last:border-b-0",
        past && "opacity-55",
        state === "today" && "bg-muted",
        selected && "bg-muted shadow-[inset_2px_0_0_var(--foreground)]",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          onClick={onClick}
          data-session-key={sessionKey}
          aria-label={label}
          aria-current={selected ? "true" : undefined}
          className={cn(
            layout,
            "transition-colors duration-150 ease-stride not-aria-[current]:hover:bg-muted focus-visible:outline-offset-[-2px] data-panel-source:bg-muted data-panel-source:shadow-[inset_2px_0_0_var(--foreground)]",
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
