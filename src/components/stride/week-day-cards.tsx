import { Chip } from "@/components/stride/chip";
import type { Zone } from "@/components/stride/session-blocks";
import {
  MissingValue,
  SessionStateMark,
  sessionStateLabels,
  type SessionRowState,
} from "@/components/stride/session-row";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { WeekStrip } from "@/components/stride/week-strip";
import { cn } from "@/lib/utils";

export type WeekCardLink = {
  href: string;
  label?: string;
  sessionKey?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export type WeekCardSession = {
  key: string;
  title: string;
  intensity: { level?: Zone | null; label: string; race?: boolean } | null;
  link?: WeekCardLink;
  detail?: React.ReactNode;
  action?: React.ReactNode;
};

export type WeekCardDrop = "target" | "over" | "blocked" | "source";

export type WeekCardItemProps = React.ComponentProps<"li"> & { date: string };

export type WeekCardDay = {
  date: string;
  dayLabel: string;
  state: SessionRowState;
  isToday: boolean;
  isPast: boolean;
  compliance?: string;
  metrics?: string;
  link?: WeekCardLink;
  sessions: WeekCardSession[];
  action?: React.ReactNode;
  drop?: WeekCardDrop;
  note?: React.ReactNode;
  pending?: boolean;
};

const linkClass =
  "transition-colors duration-150 ease-stride hover:bg-muted data-panel-source:bg-muted";

function CardLink({
  link,
  current,
  className,
  children,
}: {
  link: WeekCardLink;
  current?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={link.href}
      aria-label={link.label}
      aria-current={current ? "date" : undefined}
      onClick={link.onClick}
      data-session-key={link.sessionKey}
      className={cn(linkClass, className)}
    >
      {children}
    </Link>
  );
}

function SessionContent({
  session,
  inset = false,
}: {
  session: WeekCardSession;
  inset?: boolean;
}) {
  return (
    <>
      <span
        className={cn("line-clamp-2 font-medium", inset && "pr-7.5 md:pr-5")}
      >
        {session.title}
      </span>
      {session.intensity && (
        <span>
          <Chip
            intensity={session.intensity.level ?? undefined}
            race={session.intensity.race}
          >
            {session.intensity.label}
          </Chip>
        </span>
      )}
      {session.detail}
    </>
  );
}

function Sessions({ day }: { day: WeekCardDay }) {
  const linked = !day.link && day.sessions.length > 1;
  return day.sessions.map((session, index) => (
    <div
      key={session.key}
      className={cn(
        "flex flex-col gap-2",
        index > 0 && "border-t border-dashed border-control-border pt-2",
      )}
    >
      {linked && session.link ? (
        <span className="flex items-start gap-1">
          <CardLink
            link={session.link}
            className="-mx-1.5 -my-1 flex min-w-0 flex-1 flex-col gap-2 rounded-md px-1.5 py-1 focus-visible:outline-offset-0"
          >
            <SessionContent session={session} />
          </CardLink>
          {session.action}
        </span>
      ) : (
        <SessionContent session={session} inset={Boolean(day.action)} />
      )}
    </div>
  ));
}

function CardContent({ day }: { day: WeekCardDay }) {
  const faded = day.drop === "blocked" || day.drop === "source";
  return (
    <>
      <span
        className={cn(
          "flex flex-col gap-2",
          !day.note && "flex-1",
          faded && "opacity-35",
        )}
      >
        <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-label">
          <SessionStateMark state={day.state} />
          <span className="whitespace-nowrap text-muted-foreground tabular-nums">
            {day.dayLabel}
          </span>
          <span className="sr-only">{sessionStateLabels[day.state]}</span>
          {day.compliance && (
            <span className="ml-auto font-medium whitespace-nowrap text-primary tabular-nums">
              {day.compliance}
            </span>
          )}
        </span>
        <Sessions day={day} />
        {!day.note && (
          <span className="mt-auto text-label text-muted-foreground tabular-nums">
            <MissingValue value={day.metrics} />
          </span>
        )}
      </span>
      {day.note && <span className="mt-auto text-label">{day.note}</span>}
    </>
  );
}

const dropClasses: Record<WeekCardDrop, string> = {
  target: "outline-1 outline-offset-2 outline-primary outline-dashed",
  over: "bg-accent outline-2 outline-offset-2 outline-primary outline-solid",
  blocked: "cursor-not-allowed bg-background",
  source: "border-dashed border-control-border bg-transparent",
};

function cardClass(day: WeekCardDay) {
  return cn(
    "flex h-full min-h-44 flex-col gap-2 rounded-lg border bg-card p-3",
    day.isToday ? "border-foreground" : "border-border",
    day.isPast && !day.isToday && "opacity-55",
    day.drop && dropClasses[day.drop],
    day.pending && "opacity-60",
  );
}

export function WeekCardPreview({ day }: { day: WeekCardDay }) {
  return (
    <div className={cn(cardClass(day), "border-control-border shadow-float")}>
      <CardContent day={day} />
    </div>
  );
}

export function WeekDayCards({
  days,
  label,
  className,
  item: Item,
}: {
  days: WeekCardDay[];
  label?: string;
  className?: string;
  item?: React.ComponentType<WeekCardItemProps>;
}) {
  return (
    <WeekStrip
      key={days[0]?.date}
      label={label}
      className={cn(
        "flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-4 md:px-5 lg:grid lg:grid-cols-7 lg:overflow-visible",
        className,
      )}
    >
      {days.map((day) => {
        const card = cardClass(day);
        const props = {
          "data-today": day.isToday,
          "aria-current":
            day.isToday && !day.link ? ("date" as const) : undefined,
          "aria-busy": day.pending || undefined,
          "aria-disabled": day.drop === "blocked" || undefined,
          className:
            "relative w-34 shrink-0 snap-start scroll-ml-4 md:scroll-ml-5 lg:w-auto lg:shrink",
          children: (
            <>
              {day.link ? (
                <CardLink
                  link={day.link}
                  current={day.isToday}
                  className={card}
                >
                  <CardContent day={day} />
                </CardLink>
              ) : (
                <div className={card}>
                  <CardContent day={day} />
                </div>
              )}
              {day.action && (
                <span className="absolute top-0.75 right-0.75 z-1 flex md:top-2 md:right-2">
                  {day.action}
                </span>
              )}
            </>
          ),
        };
        return Item ? (
          <Item key={day.date} date={day.date} {...props} />
        ) : (
          <li key={day.date} {...props} />
        );
      })}
    </WeekStrip>
  );
}
