"use client";

import { useSearchParams } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import { parseRacesView, racesViewHref, racesViews } from "../overview";

export function RacesTabs({ season }: { season: string }) {
  const view = parseRacesView(useSearchParams().get("view"));
  const labels = { season: `Saison ${season}`, past: "Passées" } as const;
  return (
    <nav
      aria-label="Vues des courses"
      className="flex min-w-0 items-stretch gap-5 self-stretch"
    >
      <span className="flex items-center font-medium">Courses</span>
      {racesViews.map((item) => (
        <Link
          key={item}
          href={racesViewHref(item)}
          aria-current={item === view ? "page" : undefined}
          scroll={false}
          className={cn(
            "flex shrink-0 items-center border-b-2 px-0.5 whitespace-nowrap transition-colors duration-150 ease-stride focus-visible:outline-offset-[-2px]",
            item === view
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[item]}
        </Link>
      ))}
    </nav>
  );
}
