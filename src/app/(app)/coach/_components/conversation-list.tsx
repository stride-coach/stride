"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type {
  ConversationRow,
  ConversationSection,
} from "@/features/coach/conversations";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { ThreadStatusLabel } from "@/features/coach/components/thread-status";

type Filter = "all" | "mine";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "mine", label: "À toi" },
];

function needsAthlete(row: ConversationRow) {
  return row.status === "question" || row.status === "proposal";
}

function RowAvatar({ row }: { row: ConversationRow }) {
  const specialist = row.participants.find((agent) => agent !== "coach");
  if (!specialist) return <StaffAvatar agent="coach" size={30} decorative />;
  return (
    <span className="relative block size-9">
      <StaffAvatar agent="coach" size={30} decorative />
      <span className="absolute -right-1 -bottom-1 rounded-full bg-background p-0.5">
        <StaffAvatar agent={specialist} size={22} decorative />
      </span>
    </span>
  );
}

function Row({ row, current }: { row: ConversationRow; current: boolean }) {
  return (
    <Link
      href={`/coach/${row.id}`}
      aria-current={current ? "page" : undefined}
      className={cn(
        "grid min-h-row-touch grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-lg px-3 py-2.5 text-foreground transition-colors duration-150 ease-stride hover:bg-muted md:min-h-row",
        current && "bg-muted",
      )}
    >
      <RowAvatar row={row} />
      <span className="flex min-w-0 flex-col gap-0.75">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "flex-1 truncate",
              row.unread ? "font-semibold" : "font-medium",
            )}
          >
            {row.title}
          </span>
          <span className="shrink-0 text-label text-muted-foreground tabular-nums">
            {row.date}
          </span>
          {row.unread && (
            <span className="size-2 shrink-0 self-center rounded-full bg-primary">
              <span className="sr-only">Non lu</span>
            </span>
          )}
        </span>
        {row.preview && (
          <span className="line-clamp-2 text-secondary-foreground">
            {row.preview}
          </span>
        )}
        <ThreadStatusLabel status={row.status} />
      </span>
    </Link>
  );
}

export function ConversationList({
  sections,
  currentId,
  mobileHeader,
}: {
  sections: ConversationSection[];
  currentId: string | null;
  mobileHeader?: React.ReactNode;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const waiting = sections
    .flatMap((section) => section.rows)
    .filter(needsAthlete).length;
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr-FR");
    return sections
      .map((section) => ({
        ...section,
        rows: section.rows.filter(
          (row) =>
            (filter === "all" || needsAthlete(row)) &&
            (!query ||
              `${row.title} ${row.preview}`
                .toLocaleLowerCase("fr-FR")
                .includes(query)),
        ),
      }))
      .filter((section) => section.rows.length > 0);
  }, [sections, filter, search]);
  const empty = sections.length === 0;

  return (
    <section
      aria-label="Conversations"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-col gap-2.5 px-4 pt-4 pb-2.5 min-[980px]:px-3">
        {mobileHeader}
        <div
          className={cn(
            "flex items-center gap-2",
            mobileHeader && "max-[980px]:hidden",
          )}
        >
          <h2 className="font-medium">Conversations</h2>
          <Button asChild variant="outline" className="ml-auto">
            <Link href="/coach/new">
              <PlusIcon aria-hidden="true" />
              Nouvelle
            </Link>
          </Button>
        </div>
        {!empty && (
          <>
            <InputGroup className="h-control-touch md:h-control">
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                aria-label="Rechercher une conversation"
                placeholder="Rechercher"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
            <div
              role="group"
              aria-label="Filtrer"
              className="flex flex-nowrap gap-1.5"
            >
              {filters.map((item) => (
                <Toggle
                  key={item.value}
                  pressed={filter === item.value}
                  onPressedChange={() => setFilter(item.value)}
                  className="min-h-control-touch rounded-md border-border bg-transparent px-2.5 font-normal text-muted-foreground hover:text-foreground data-[state=on]:border-control-border data-[state=on]:bg-muted data-[state=on]:font-medium data-[state=on]:text-foreground md:min-h-6"
                >
                  {item.value === "mine"
                    ? `${item.label} · ${waiting}`
                    : item.label}
                </Toggle>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-1.5 pb-18 md:pb-3">
        {empty && (
          <p className="px-3 py-6 text-muted-foreground">
            Aucune conversation pour l’instant. Écris au Coach pour commencer.
          </p>
        )}
        {!empty && visible.length === 0 && (
          <p className="px-3 py-6 text-muted-foreground">
            Aucune conversation ne correspond.
          </p>
        )}
        {visible.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <span className="px-3 pt-2.5 pb-0.5 text-label font-medium text-muted-foreground">
              {section.label}
            </span>
            {section.rows.map((row) => (
              <Row key={row.id} row={row} current={row.id === currentId} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
