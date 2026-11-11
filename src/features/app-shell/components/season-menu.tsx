"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { sessionKeyDate } from "@/features/plans/model/keys";
import { defaultSeason, seasonFor } from "@/features/plans/view/seasons";
import { cn } from "@/lib/utils";
import type { ShellSeason } from "../shell";
import { useShellIdentity } from "./shell-identity";
import { useShellPathname } from "./shell-pathname";

const groups = [
  { status: "current", label: "Saison en cours" },
  { status: "future", label: "À venir" },
  { status: "past", label: "Passées" },
] as const;

const hint = "une par course A, jusqu’à la fin de sa récupération";

export function useSeasonSelection() {
  const promise = useShellIdentity()?.seasons;
  const seasons = promise ? use(promise) : [];
  const pathname = useShellPathname();
  const params = useSearchParams();
  const onPlan = pathname === "/plan";
  const session = params.get("session");
  const selected = onPlan
    ? seasonFor(seasons, {
        season: params.get("season"),
        race: params.get("race"),
        week: params.get("week"),
        session: session ? sessionKeyDate(session) : null,
      })
    : defaultSeason(seasons);
  return { seasons, selected, onPlan };
}

export function SeasonBadge({
  season,
}: {
  season: Pick<ShellSeason, "letter" | "status">;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-sm text-micro leading-none font-bold tabular-nums",
        season.letter === null
          ? "border border-dashed border-control-border text-muted-foreground!"
          : season.status === "current"
            ? "bg-primary text-primary-foreground!"
            : season.status === "future"
              ? "border border-primary text-primary!"
              : "border border-control-border bg-muted text-secondary-foreground!",
      )}
    >
      {season.letter ?? "–"}
    </span>
  );
}

function seasonLabel(season: ShellSeason) {
  return [
    season.letter ? `Course ${season.letter}` : null,
    season.name,
    season.dates,
    season.progress,
    season.countdown,
  ]
    .filter(Boolean)
    .join(", ");
}

function SeasonRow({
  season,
  selected,
  touch = false,
}: {
  season: ShellSeason;
  selected: boolean;
  touch?: boolean;
}) {
  return (
    <>
      <SeasonBadge season={season} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={cn("truncate font-medium", touch && "text-body-lg")}>
          {season.name}
        </span>
        <span className="truncate text-label text-muted-foreground">
          {season.dates}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-px text-label tabular-nums">
        <span className="font-medium text-secondary-foreground">
          {season.progress}
        </span>
        {season.countdown && (
          <span className="text-muted-foreground">{season.countdown}</span>
        )}
      </span>
      <span className="grid w-3.5 shrink-0 place-items-center">
        {selected && (
          <CheckIcon
            aria-hidden="true"
            className="size-3.5 text-primary!"
            strokeWidth={2.5}
          />
        )}
      </span>
    </>
  );
}

function grouped(seasons: ShellSeason[]) {
  return groups.flatMap(({ status, label }) => {
    const items = seasons.filter((season) => season.status === status);
    if (items.length === 0) return [];
    return [
      { status, label, items: status === "past" ? items.reverse() : items },
    ];
  });
}

export function SeasonMenu({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  const { seasons, selected } = useSeasonSelection();
  if (!selected) return fallback;
  return (
    <>
      {children}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Saison : ${selected.name}, ${selected.progress}`}
          className="flex h-control min-w-0 items-center gap-2 rounded-md px-2 font-medium transition-colors duration-150 ease-stride hover:bg-muted aria-expanded:bg-muted"
        >
          <SeasonBadge season={selected} />
          <span className="truncate">{selected.name}</span>
          <span className="shrink-0 font-normal text-muted-foreground tabular-nums">
            {selected.progress}
          </span>
          <ChevronsUpDownIcon
            aria-hidden="true"
            className="size-3 shrink-0 text-muted-foreground"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          aria-labelledby="season-menu-title"
          className="w-105 max-w-[calc(100vw-2rem)] rounded-xl bg-background p-1.5 shadow-float"
        >
          <div className="flex items-baseline gap-2 px-2.5 pt-2 pb-0.5">
            <span id="season-menu-title" className="font-semibold">
              Saisons
            </span>
            <span className="truncate text-label text-muted-foreground">
              {hint}
            </span>
          </div>
          {grouped(seasons).map((group) => (
            <DropdownMenuGroup key={group.status}>
              <DropdownMenuLabel className="px-2.5 pt-2.5 pb-1 text-label font-medium text-muted-foreground">
                {group.label}
              </DropdownMenuLabel>
              {group.items.map((season) => {
                const active = season.id === selected.id;
                return (
                  <DropdownMenuItem
                    key={season.id}
                    asChild
                    className={cn(
                      "min-h-12 gap-2.5 px-2.5 text-body",
                      active && "bg-muted",
                    )}
                  >
                    <Link
                      href={season.href}
                      role="menuitemradio"
                      aria-checked={active}
                      aria-label={seasonLabel(season)}
                    >
                      <SeasonRow season={season} selected={active} />
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          ))}
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem
            asChild
            className="min-h-8 gap-2 px-2.5 text-body font-medium text-secondary-foreground"
          >
            <Link href="/races">
              Toutes les courses
              <ArrowRightIcon
                aria-hidden="true"
                className="ml-auto size-3.5 text-muted-foreground"
              />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function SeasonSheet() {
  const { seasons, selected } = useSeasonSelection();
  const [open, setOpen] = useState(false);
  if (!selected) return null;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={`Saison : ${selected.name}, ${selected.progress}`}
        className="relative flex h-9 min-w-0 items-center gap-1 rounded-md px-1.5 text-secondary-foreground after:absolute after:inset-x-0 after:-inset-y-1 aria-expanded:bg-muted"
      >
        <span className="truncate">{selected.name}</span>
        <ChevronsUpDownIcon
          aria-hidden="true"
          className="size-3 shrink-0 text-muted-foreground"
        />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[85svh] gap-0 overflow-y-auto px-2 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-2 h-1 w-9 shrink-0 rounded-full bg-control-border"
        />
        <div className="flex flex-col gap-0.5 px-2.5 pt-1 pb-0.5">
          <SheetTitle className="text-body-lg">Saisons</SheetTitle>
          <SheetDescription className="text-label">
            Une par course A, jusqu’à la fin de sa récupération.
          </SheetDescription>
        </div>
        {grouped(seasons).map((group) => {
          const id = `season-sheet-${group.status}`;
          return (
            <section key={group.status} aria-labelledby={id}>
              <h3
                id={id}
                className="px-2.5 pt-2.5 pb-1 text-label font-medium text-muted-foreground"
              >
                {group.label}
              </h3>
              <ul className="flex flex-col">
                {group.items.map((season) => {
                  const active = season.id === selected.id;
                  return (
                    <li key={season.id}>
                      <SheetClose asChild>
                        <Link
                          href={season.href}
                          aria-current={active ? "true" : undefined}
                          aria-label={seasonLabel(season)}
                          className={cn(
                            "flex min-h-14 items-center gap-2.5 rounded-md px-2.5 py-1.5",
                            active && "bg-muted",
                          )}
                        >
                          <SeasonRow season={season} selected={active} touch />
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <div className="mt-1.5 border-t border-border pt-1.5">
          <SheetClose asChild>
            <Link
              href="/races"
              className="flex min-h-11 items-center gap-2 rounded-md px-2.5 font-medium text-secondary-foreground"
            >
              Toutes les courses
              <ArrowRightIcon
                aria-hidden="true"
                className="ml-auto size-3.5 text-muted-foreground"
              />
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
