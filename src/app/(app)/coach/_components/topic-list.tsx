"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { listDateLabel } from "@/features/coach/conversations";
import { staff } from "@/features/coach/staff";
import {
  topicRowDate,
  topicRowMeta,
  topicSections,
  type TopicSummary,
} from "@/features/coach/topics";

export type TopicListProps = {
  topics: readonly TopicSummary[];
  current: string | null;
  mainActivityAt: string | null;
  now: Date;
  timeZone: string;
  onNavigate?: () => void;
};

function Row({
  href,
  title,
  meta,
  date,
  current,
  closed = false,
  unread = false,
  agent,
  onNavigate,
}: {
  href: string;
  title: string;
  meta: string;
  date: string;
  current: boolean;
  closed?: boolean;
  unread?: boolean;
  agent: TopicSummary["lead"];
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        aria-current={current ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "grid min-h-row-touch grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2.5 py-2 transition-colors duration-150 ease-stride hover:bg-muted md:min-h-row",
          current && "bg-muted",
        )}
      >
        <StaffAvatar
          agent={agent}
          size={30}
          decorative
          className={cn(closed && "opacity-60")}
        />
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate",
              closed
                ? "text-secondary-foreground"
                : unread
                  ? "font-semibold"
                  : "font-medium",
            )}
          >
            {title}
            {unread && <span className="sr-only">, non lu</span>}
          </span>
          <span className="truncate text-label text-muted-foreground">
            {meta}
          </span>
        </span>
        <span className="self-start pt-0.5 text-label text-muted-foreground tabular-nums">
          {date}
        </span>
      </Link>
    </li>
  );
}

export function TopicList({
  topics,
  current,
  mainActivityAt,
  now,
  timeZone,
  onNavigate,
}: TopicListProps) {
  const { open, closed } = topicSections(topics);
  return (
    <nav aria-label="Fil principal et sujets" className="flex flex-col gap-1">
      <ul>
        <Row
          href="/coach"
          title="Fil principal"
          meta="Ton staff au quotidien"
          date={
            mainActivityAt ? listDateLabel(mainActivityAt, now, timeZone) : ""
          }
          current={current === null}
          agent="coach"
          onNavigate={onNavigate}
        />
      </ul>
      {open.length > 0 && (
        <section aria-label="Sujets ouverts">
          <h3 className="px-2.5 pt-2 pb-1 text-label font-medium text-muted-foreground">
            Sujets ouverts
          </h3>
          <ul>
            {open.map((topic) => (
              <Row
                key={topic.id}
                href={`/coach/${topic.id}`}
                title={topic.title}
                meta={topicRowMeta(staff, topic)}
                date={topicRowDate(topic, now, timeZone)}
                current={current === topic.id}
                unread={topic.unread}
                agent={topic.lead}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </section>
      )}
      {closed.length > 0 && (
        <section aria-label="Sujets clos">
          <h3 className="px-2.5 pt-2 pb-1 text-label font-medium text-muted-foreground">
            Sujets clos
          </h3>
          <ul>
            {closed.map((topic) => (
              <Row
                key={topic.id}
                href={`/coach/${topic.id}`}
                title={topic.title}
                meta={topicRowMeta(staff, topic)}
                date={topicRowDate(topic, now, timeZone)}
                current={current === topic.id}
                closed
                agent={topic.lead}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </section>
      )}
    </nav>
  );
}
