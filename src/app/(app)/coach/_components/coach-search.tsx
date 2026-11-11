"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  authorLabel,
  counterLabel,
  resultDateLabel,
  resultHref,
  resultsHeading,
  searchRows,
  searchScopes,
  visibleSearchRows,
  type SearchResult,
  type SearchScope,
} from "@/features/coach/search";
import type { TopicSummary } from "@/features/coach/topics";

export type CoachSearchState = {
  query: string;
  valid: boolean;
  scopes: SearchScope[];
  results: SearchResult[];
  index: number;
  date: string | null;
};

const scopeLabels: Record<SearchScope, string> = {
  main: "Fil principal",
  topics: "Sujets",
  decisions: "Décisions",
};

function closeOnEscape(onClose: () => void) {
  return (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (!event.currentTarget.contains(event.target as Node)) return;
    event.preventDefault();
    onClose();
  };
}

function DateJump({
  date,
  today,
  onDate,
}: {
  date: string | null;
  today: string;
  onDate: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(date ?? today);
  const inputId = useId();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="max-md:hidden">
          Aller à une date
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="gap-2 p-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!value) return;
            setOpen(false);
            onDate(value);
          }}
        >
          <Label htmlFor={inputId}>Aller à une date</Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              type="date"
              lang="fr-FR"
              required
              max={today}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button type="submit">Aller</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function SearchBar({
  search,
  inputRef,
  today,
  onQuery,
  onStep,
  onDate,
  onClose,
}: {
  search: CoachSearchState;
  inputRef: React.RefObject<HTMLInputElement | null>;
  today: string;
  onQuery: (query: string) => void;
  onStep: (direction: "older" | "newer") => void;
  onDate: (date: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(search.query);
  const [synced, setSynced] = useState(search.query);
  if (synced !== search.query) {
    setSynced(search.query);
    if (value === synced) setValue(search.query);
  }
  const latest = useRef(onQuery);
  useEffect(() => {
    latest.current = onQuery;
  });
  useEffect(() => {
    if (value === synced) return;
    const timer = window.setTimeout(() => latest.current(value), 250);
    return () => window.clearTimeout(timer);
  }, [value, synced]);

  const total = search.results.length;
  const older = search.valid && search.index > 0;
  const newer = search.valid && search.index >= 0 && search.index < total - 1;

  return (
    <div
      role="search"
      aria-label="Rechercher dans la conversation"
      onKeyDown={closeOnEscape(onClose)}
      className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2 md:px-5 md:py-2.5"
    >
      <InputGroup className="h-9 min-w-0 flex-1 rounded-lg md:h-8">
        <InputGroupInput
          ref={inputRef}
          type="search"
          autoFocus
          aria-label="Rechercher dans la conversation"
          placeholder="Rechercher dans la conversation…"
          enterKeyHint="search"
          maxLength={200}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (value !== synced) onQuery(value);
            else onStep(event.shiftKey ? "newer" : "older");
          }}
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        <InputGroupAddon align="inline-end" className="font-normal">
          <span
            role="status"
            aria-live="polite"
            className="text-label whitespace-nowrap text-muted-foreground tabular-nums"
          >
            {search.valid
              ? total > 0
                ? counterLabel(search.index, total)
                : "0 sur 0"
              : ""}
          </span>
        </InputGroupAddon>
      </InputGroup>
      <Button
        variant="outline"
        size="icon"
        aria-label="Résultat précédent"
        disabled={!older}
        onClick={() => onStep("older")}
        className="max-md:size-9"
      >
        <ArrowUpIcon aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Résultat suivant"
        disabled={!newer}
        onClick={() => onStep("newer")}
        className="max-md:size-9"
      >
        <ArrowDownIcon aria-hidden="true" />
      </Button>
      <DateJump date={search.date} today={today} onDate={onDate} />
      <Button
        variant="ghost"
        onClick={onClose}
        className="text-secondary-foreground max-md:h-9"
      >
        Fermer
      </Button>
    </div>
  );
}

export function SearchPanel({
  search,
  topics,
  now,
  timeZone,
  onScopes,
  onOpen,
  onClose,
}: {
  search: CoachSearchState;
  topics: readonly TopicSummary[];
  now: Date;
  timeZone: string;
  onScopes: (scopes: SearchScope[]) => void;
  onOpen: (result: SearchResult) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = searchRows(search.results, topics);
  const shown = expanded ? rows : rows.slice(0, visibleSearchRows);
  const hidden = rows.length - shown.length;
  const currentId = search.results[search.index]?.id ?? null;
  const headingId = useId();
  const scopesId = useId();
  return (
    <div className="flex flex-col" onKeyDown={closeOnEscape(onClose)}>
      {search.valid && (
        <section
          aria-labelledby={headingId}
          className="flex flex-col gap-2 border-b border-border pb-3.5"
        >
          <h2
            id={headingId}
            className="text-label font-medium text-muted-foreground"
          >
            {resultsHeading(search.results.length, search.query)}
          </h2>
          {shown.length > 0 && (
            <ul className="-mx-2.5 flex flex-col">
              {shown.map((row) => {
                const current =
                  row.type === "result"
                    ? row.result.id === currentId
                    : row.results.some((result) => result.id === currentId);
                return (
                  <li key={row.key}>
                    <Link
                      href={resultHref(row.result, search.query, search.scopes)}
                      scroll={false}
                      replace
                      prefetch={false}
                      aria-current={current ? "true" : undefined}
                      onClick={() => onOpen(row.result)}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-lg px-2.5 py-2 hover:bg-muted",
                        current && "bg-muted",
                      )}
                    >
                      <span className="text-label text-muted-foreground tabular-nums">
                        {row.type === "result"
                          ? `${resultDateLabel(row.result.at, now, timeZone)} · ${authorLabel(row.result.author)}`
                          : row.title}
                      </span>
                      <span className="line-clamp-2">
                        {row.type === "result" ? row.result.excerpt : row.meta}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {hidden > 0 && (
            <Button
              variant="link"
              onClick={() => setExpanded(true)}
              className="h-auto self-start p-0 text-label font-medium"
            >
              {hidden === 1 ? "Voir l’autre" : `Voir les ${hidden} autres`}
            </Button>
          )}
        </section>
      )}
      <section
        aria-labelledby={scopesId}
        className={cn("flex flex-col gap-2", search.valid && "pt-3.5")}
      >
        <h2
          id={scopesId}
          className="text-label font-medium text-muted-foreground"
        >
          Chercher dans
        </h2>
        <ToggleGroup
          type="multiple"
          aria-labelledby={scopesId}
          value={search.scopes}
          onValueChange={(values) => {
            const scopes = searchScopes.filter((scope) =>
              values.includes(scope),
            );
            if (scopes.length) onScopes(scopes);
          }}
          className="gap-1.5"
        >
          {searchScopes.map((scope) => (
            <ToggleGroupItem
              key={scope}
              value={scope}
              className="min-h-control-auto rounded-sm px-2 text-label data-[state=on]:border-transparent data-[state=on]:bg-accent data-[state=on]:font-medium data-[state=on]:text-primary md:min-h-5"
            >
              {scopeLabels[scope]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-label text-muted-foreground">
          La recherche couvre tout ce que tu as échangé avec le staff, y compris
          les sujets clos.
        </p>
      </section>
    </div>
  );
}
