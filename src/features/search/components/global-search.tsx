"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  ArrowRightIcon,
  ClockIcon,
  CornerDownLeftIcon,
  RotateCwIcon,
} from "lucide-react";
import {
  NavActivitiesIcon,
  NavPlanIcon,
  NavRacesIcon,
  NavTodayIcon,
} from "@/components/stride/nav-icons";
import { StrideMark } from "@/components/stride/stride-mark";
import { Status } from "@/components/stride/status";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { coachRequestHref } from "@/features/coach/request";
import { useDataActivityNavigation } from "@/features/data-activity/components/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { highlightParts, type MatchRange } from "../match";
import {
  emptyRecents,
  latestRecents,
  parseRecents,
  recentQueryDetail,
  rememberItem,
  rememberQuery,
  type Recents,
} from "../recents";
import {
  minimumQueryLength,
  moreLabel,
  recentDetail,
  resultCount,
  searchActions,
  searchGroups,
  searchIndexSchema,
  type SearchIndex,
  type SearchItem,
  type SearchKind,
} from "../results";
import { openSearchEvent } from "./search-trigger";

const recentsKey = "stride:search-recents";

type IndexState =
  | { status: "idle" | "loading" | "error"; index: SearchIndex | null }
  | { status: "ready"; index: SearchIndex };

type Row = {
  value: string;
  title: string;
  ranges?: readonly MatchRange[];
  detail?: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  item?: SearchItem;
  run?: () => void;
  tone?: "link";
};

type Section = { key: string; heading: string; count?: number; rows: Row[] };

const kindIcons: Record<SearchKind, React.ReactNode> = {
  action: <ArrowRightIcon />,
  session: <NavPlanIcon />,
  activity: <NavActivitiesIcon />,
  race: <NavRacesIcon />,
};

const destinations: Row[] = [
  {
    value: "go:today",
    title: "Aujourd’hui",
    href: "/today",
    icon: <NavTodayIcon />,
  },
  { value: "go:plan", title: "Plan", href: "/plan", icon: <NavPlanIcon /> },
  {
    value: "go:activities",
    title: "Activités",
    href: "/activities",
    icon: <NavActivitiesIcon />,
    trailing: (
      <>
        <Kbd>G</Kbd>
        <Kbd>A</Kbd>
      </>
    ),
  },
  {
    value: "go:races",
    title: "Courses",
    href: "/races",
    icon: <NavRacesIcon />,
  },
];

const openingActions = ["action:add-race", "action:ask-coach"];

function readRecents() {
  try {
    return parseRecents(window.localStorage.getItem(recentsKey));
  } catch {
    return emptyRecents;
  }
}

function writeRecents(recents: Recents) {
  try {
    window.localStorage.setItem(recentsKey, JSON.stringify(recents));
  } catch {
    return;
  }
}

function rememberChoice(
  recents: Recents,
  item: SearchItem | null,
  query: string | null,
  count: number,
) {
  const at = Date.now();
  let next = recents;
  if (item)
    next = rememberItem(
      next,
      {
        kind: item.kind,
        id: item.id,
        title: item.title,
        detail: recentDetail(item),
        href: item.href,
      },
      at,
    );
  return query ? rememberQuery(next, query, count, at) : next;
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest("input, textarea, select, [contenteditable='true']") !==
        null)
  );
}

function Highlighted({
  text,
  ranges = [],
}: {
  text: string;
  ranges?: readonly MatchRange[];
}) {
  return highlightParts(text, ranges).map((part, index) =>
    part.match ? (
      <mark key={index} className="rounded-mark bg-accent text-primary">
        {part.text}
      </mark>
    ) : (
      <React.Fragment key={index}>{part.text}</React.Fragment>
    ),
  );
}

function itemRow(item: SearchItem, ranges: readonly MatchRange[]): Row {
  return {
    value: item.id,
    title: item.title,
    ranges,
    detail: item.detail,
    icon: kindIcons[item.kind],
    href: item.href,
    item,
    trailing:
      item.badge === "today" ? (
        <Badge variant="accent">Aujourd’hui</Badge>
      ) : item.badge === "done" ? (
        <Status level="ok">Faite</Status>
      ) : undefined,
  };
}

function ResultRow({
  row,
  onSelect,
}: {
  row: Row;
  onSelect: (row: Row) => void;
}) {
  return (
    <CommandItem
      value={row.value}
      onSelect={() => onSelect(row)}
      className={cn(row.tone === "link" && "min-h-9 text-primary")}
    >
      {row.tone !== "link" && (
        <span
          aria-hidden="true"
          className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4"
        >
          {row.icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          <Highlighted text={row.title} ranges={row.ranges} />
        </span>
        {row.detail && (
          <span className="truncate text-label text-secondary-foreground tabular-nums">
            {row.detail}
          </span>
        )}
      </span>
      {(row.trailing || row.href) && (
        <CommandShortcut>
          {row.trailing}
          <Kbd
            aria-hidden="true"
            className="hidden group-data-selected/command-item:inline-flex max-md:group-data-selected/command-item:hidden"
          >
            <CornerDownLeftIcon />
          </Kbd>
        </CommandShortcut>
      )}
    </CommandItem>
  );
}

function LoadingRows({ label }: { label?: string }) {
  return (
    <div className="px-2 py-1">
      {label && (
        <p className="px-2 pt-2 pb-1 text-label text-muted-foreground">
          {label}
        </p>
      )}
      {[0, 1].map((row) => (
        <div key={row} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="size-4 rounded-sm" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-2 w-1/3" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function GlobalSearch() {
  const isMobile = useIsMobile();
  const navigate = useDataActivityNavigation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState("");
  const [expanded, setExpanded] = React.useState<ReadonlySet<SearchKind>>(
    () => new Set(),
  );
  const [state, setState] = React.useState<IndexState>({
    status: "idle",
    index: null,
  });
  const [recents, setRecents] = React.useState<Recents>(emptyRecents);
  const [attempt, setAttempt] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(() => {
    setState((current) => ({ status: "loading", index: current.index }));
    setAttempt((value) => value + 1);
  }, []);

  const show = React.useCallback(() => {
    load();
    setRecents(readRecents());
    setQuery("");
    setExpanded(new Set());
    setOpen(true);
  }, [load]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        if (open) setOpen(false);
        else show();
        return;
      }
      if (
        event.key === "/" &&
        !open &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target) &&
        !document.querySelector("[role='dialog']")
      ) {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(openSearchEvent, show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(openSearchEvent, show);
    };
  }, [open, show]);

  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/search", {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Search index ${response.status}`);
        const index = searchIndexSchema.parse(await response.json());
        setState({ status: "ready", index });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((current) => ({ status: "error", index: current.index }));
      });
    return () => controller.abort();
  }, [open, attempt]);

  const trimmed = query.trim();
  const searching = trimmed.length >= minimumQueryLength;
  const groups = React.useMemo(
    () =>
      searching && state.index
        ? searchGroups(state.index, trimmed, expanded)
        : [],
    [searching, state.index, trimmed, expanded],
  );
  const count = resultCount(groups);

  function persist(next: Recents) {
    setRecents(next);
    writeRecents(next);
  }

  function go(href: string, newTab: boolean) {
    if (newTab) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    setOpen(false);
    navigate(href);
  }

  function choose(row: Row, newTab = false) {
    if (row.run) {
      row.run();
      return;
    }
    if (!row.href) return;
    const next = rememberChoice(
      recents,
      row.item ?? null,
      searching ? trimmed : null,
      count,
    );
    if (next !== recents) persist(next);
    go(row.href, newTab);
  }

  const sections: Section[] = [];
  if (!searching) {
    const latest = latestRecents(recents);
    if (latest.length > 0)
      sections.push({
        key: "recents",
        heading: "Récents",
        rows: [
          ...latest.map((recent): Row =>
            recent.type === "item"
              ? {
                  value: `recent:${recent.id}`,
                  title: recent.title,
                  detail: recent.detail,
                  icon: <ClockIcon />,
                  href: recent.href,
                }
              : {
                  value: `recent-query:${recent.query}`,
                  title: recent.query,
                  detail: recentQueryDetail(recent.count),
                  icon: <ClockIcon />,
                  run: () => setQuery(recent.query),
                },
          ),
          {
            value: "recents:clear",
            title: "Effacer l’historique de recherche",
            icon: null,
            tone: "link",
            run: () => persist(emptyRecents),
          },
        ],
      });
    sections.push({ key: "go", heading: "Aller à", rows: destinations });
    sections.push({
      key: "actions",
      heading: "Actions",
      rows: searchActions
        .filter((action) => openingActions.includes(action.id))
        .map((action) => ({
          value: action.id,
          title: action.title,
          icon: <ArrowRightIcon />,
          href: action.href,
        })),
    });
  } else {
    for (const group of groups) {
      const rows = group.hits.map((hit) => itemRow(hit.item, hit.ranges));
      const more = group.more;
      if (more) {
        const kind = group.kind;
        rows.push({
          value: `more:${kind}`,
          title: moreLabel(more.count),
          icon: null,
          tone: "link",
          ...(more.href
            ? { href: more.href }
            : {
                run: () =>
                  setExpanded((current) => new Set([...current, kind])),
              }),
        });
      }
      sections.push({
        key: group.kind,
        heading: group.label,
        count: group.total,
        rows,
      });
    }
    if (state.index && groups.length === 0)
      sections.push({
        key: "instead",
        heading: "À la place",
        rows: [
          {
            value: "ask-coach",
            title: `Demander au coach : « ${trimmed} »`,
            detail: "La question s’ouvre dans le fil principal",
            icon: <StrideMark />,
            href: coachRequestHref(trimmed),
          },
        ],
      });
  }

  const rowsByValue = new Map(
    sections.flatMap((section) => section.rows.map((row) => [row.value, row])),
  );
  const firstValues = sections.flatMap((section) =>
    section.rows[0] ? [section.rows[0].value] : [],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      const row = rowsByValue.get(selected);
      if (row?.href) {
        event.preventDefault();
        choose(row, true);
      }
      return;
    }
    if (event.key === "Tab" && firstValues.length > 1) {
      event.preventDefault();
      const current = sections.findIndex((section) =>
        section.rows.some((row) => row.value === selected),
      );
      const step = event.shiftKey ? -1 : 1;
      const next = (current + step + firstValues.length) % firstValues.length;
      setSelected(firstValues[next]!);
    }
  }

  const loadingIndex = searching && !state.index && state.status !== "error";
  const failed = searching && !state.index && state.status === "error";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay max-md:hidden data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            if (!query) return;
            event.preventDefault();
            setQuery("");
          }}
          className="fixed z-50 flex flex-col overflow-hidden bg-popover text-popover-foreground outline-none max-md:inset-0 max-md:pt-[env(safe-area-inset-top)] md:top-[12svh] md:left-1/2 md:max-h-[min(76svh,40rem)] md:w-[min(560px,calc(100vw-2rem))] md:-translate-x-1/2 md:rounded-2xl md:border md:border-control-border md:shadow-float data-open:animate-in data-open:fade-in-0 md:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
        >
          <DialogPrimitive.Title className="sr-only">
            Rechercher dans Stride
          </DialogPrimitive.Title>
          <Command
            shouldFilter={false}
            loop
            value={selected}
            onValueChange={setSelected}
            onKeyDown={onKeyDown}
            label="Rechercher dans Stride"
            className="min-h-0 flex-1"
          >
            <CommandInput
              ref={inputRef}
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                setExpanded(new Set());
              }}
              placeholder="Rechercher une séance, une course, une activité…"
              aria-label="Rechercher une séance, une course, une activité"
              maxLength={120}
            >
              {isMobile ? (
                <DialogPrimitive.Close className="shrink-0 rounded-md px-1 text-body text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  Annuler
                </DialogPrimitive.Close>
              ) : (
                query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 rounded-md px-1 text-label text-muted-foreground hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Effacer
                  </button>
                )
              )}
            </CommandInput>
            <CommandList className="flex-1 py-1 md:max-h-[min(60svh,32rem)]">
              {searching && state.index && groups.length === 0 && (
                <div className="px-4 pt-3 pb-1">
                  <p className="font-semibold text-foreground">
                    Rien ne correspond à « {trimmed} »
                  </p>
                  <p className="mt-1 text-body text-secondary-foreground">
                    La recherche couvre tes séances, activités et courses. Pour
                    une question, demande au coach.
                  </p>
                </div>
              )}
              {loadingIndex && <LoadingRows label="Recherche en cours…" />}
              {failed && (
                <div className="px-4 pt-3 pb-1">
                  <p className="font-semibold text-foreground">
                    Recherche indisponible
                  </p>
                  <p className="mt-1 text-body text-secondary-foreground">
                    Tes séances, activités et courses n’ont pas pu être
                    chargées.
                  </p>
                </div>
              )}
              {failed && (
                <CommandGroup>
                  <ResultRow
                    row={{
                      value: "retry",
                      title: "Réessayer",
                      icon: <RotateCwIcon />,
                      run: load,
                    }}
                    onSelect={choose}
                  />
                </CommandGroup>
              )}
              {sections.map((section) => (
                <CommandGroup
                  key={section.key}
                  heading={
                    <span className="flex items-center gap-2">
                      {section.heading}
                      {section.count !== undefined && (
                        <span className="tabular-nums">{section.count}</span>
                      )}
                    </span>
                  }
                >
                  {section.rows.map((row) => (
                    <ResultRow key={row.value} row={row} onSelect={choose} />
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <p role="status" className="sr-only">
              {searching && state.index
                ? count === 0
                  ? "Aucun résultat"
                  : `${count} résultat${count > 1 ? "s" : ""}`
                : ""}
            </p>
            <div
              aria-hidden="true"
              className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-2 text-label text-muted-foreground max-md:hidden"
            >
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                parcourir
              </span>
              <span className="flex items-center gap-1">
                <Kbd>
                  <CornerDownLeftIcon />
                </Kbd>
                ouvrir
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Kbd>Échap</Kbd>
                fermer
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
