import { Chip } from "@/components/stride/chip";
import type { Zone } from "@/components/stride/session-blocks";
import {
  MissingValue,
  SessionStateMark,
  sessionStateLabels,
  type SessionRowState,
} from "@/components/stride/session-row";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
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
};

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

function SessionContent({ session }: { session: WeekCardSession }) {
  return (
    <>
      <span className="line-clamp-2 font-medium">{session.title}</span>
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
        <CardLink
          link={session.link}
          className="-mx-1.5 -my-1 flex flex-col gap-2 rounded-md px-1.5 py-1 focus-visible:outline-offset-0"
        >
          <SessionContent session={session} />
        </CardLink>
      ) : (
        <SessionContent session={session} />
      )}
    </div>
  ));
}

function CardContent({ day }: { day: WeekCardDay }) {
  return (
    <>
      <span className="flex items-center gap-1 text-label whitespace-nowrap">
        <SessionStateMark state={day.state} />
        <span className="text-muted-foreground tabular-nums">
          {day.dayLabel}
        </span>
        <span className="sr-only">{sessionStateLabels[day.state]}</span>
        {day.compliance && (
          <span className="ml-auto font-medium text-primary tabular-nums">
            {day.compliance}
          </span>
        )}
      </span>
      <Sessions day={day} />
      <span className="mt-auto text-label text-muted-foreground tabular-nums">
        <MissingValue value={day.metrics} />
      </span>
    </>
  );
}

export function WeekDayCards({
  days,
  label,
  className,
}: {
  days: WeekCardDay[];
  label?: string;
  className?: string;
}) {
  return (
    <ol
      aria-label={label}
      className={cn("grid grid-cols-7 gap-2 px-5 py-4", className)}
    >
      {days.map((day) => {
        const card = cn(
          "flex h-full min-h-44 flex-col gap-2 rounded-lg border bg-card p-3",
          day.isToday ? "border-foreground" : "border-border",
          day.isPast && !day.isToday && "opacity-55",
        );
        return (
          <li key={day.date} aria-current={day.isToday ? "date" : undefined}>
            {day.link ? (
              <CardLink link={day.link} className={card}>
                <CardContent day={day} />
              </CardLink>
            ) : (
              <div className={card}>
                <CardContent day={day} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
