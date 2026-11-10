"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { fullscreenMapParam } from "../map";

export const raceSections = [
  { path: "", label: "Course", crumb: null },
  { path: "/roadbook", label: "Plan de course", crumb: "Plan de course" },
  { path: "/nutrition", label: "Nutrition", crumb: "Nutrition" },
  {
    path: "/gear",
    label: "Équipement et check-lists",
    crumb: "Équipement et check-lists",
  },
] as const;

const roadSections = [
  raceSections[0],
  { path: "/gear", label: "Check-lists", crumb: "Check-lists" },
] as const;

function sectionsOf(kind: "road" | "trail") {
  return kind === "road" ? roadSections : raceSections;
}

const extraCrumbs: Record<string, { crumb: string; tab: string }> = {
  "/waypoints": { crumb: "Points de passage", tab: "" },
  "/course": { crumb: "Ajouter le GPX", tab: "" },
};

function sectionOf(pathname: string, base: string, kind: "road" | "trail") {
  const rest = pathname.slice(base.length).replace(/\/$/, "");
  const extra = extraCrumbs[rest];
  if (extra) return { tab: extra.tab, crumb: extra.crumb };
  const section = sectionsOf(kind).find((item) => item.path === rest);
  return { tab: section?.path ?? "", crumb: section?.crumb ?? null };
}

export function RaceBreadcrumb({
  raceId,
  name,
  replacing,
  kind,
}: {
  raceId: string;
  name: string;
  replacing: boolean;
  kind: "road" | "trail";
}) {
  const pathname = usePathname();
  const fullscreenMap = useSearchParams().has(fullscreenMapParam);
  const base = `/races/${raceId}`;
  const { crumb } = sectionOf(pathname, base, kind);
  const label =
    crumb === "Ajouter le GPX" && replacing
      ? "Remplacer le GPX"
      : (crumb ?? (fullscreenMap ? "Carte" : null));
  return (
    <nav
      aria-label="Fil d’Ariane"
      className="flex min-w-0 flex-1 items-center gap-2 text-sm"
    >
      <Link
        href="/races"
        className="text-muted-foreground hover:text-foreground"
      >
        Courses
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
      {label ? (
        <>
          <Link
            href={base}
            className="truncate text-muted-foreground hover:text-foreground"
          >
            {name}
          </Link>
          <span aria-hidden="true" className="text-muted-foreground">
            /
          </span>
          <span aria-current="page" className="truncate">
            {label}
          </span>
        </>
      ) : (
        <span aria-current="page" className="truncate">
          {name}
        </span>
      )}
    </nav>
  );
}

export function RaceTabs({
  raceId,
  kind,
}: {
  raceId: string;
  kind: "road" | "trail";
}) {
  const pathname = usePathname();
  const base = `/races/${raceId}`;
  const { tab } = sectionOf(pathname, base, kind);
  const sections = sectionsOf(kind);
  return (
    <nav
      aria-label="Sections de la course"
      className="-mx-5 flex [scrollbar-width:none] gap-4.5 overflow-x-auto border-b border-border px-5 sm:mx-0 sm:gap-7 sm:px-0 print:hidden"
    >
      {sections.map((section) => {
        const current = section.path === tab;
        return (
          <Link
            key={section.path}
            href={`${base}${section.path}`}
            aria-current={current ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-0.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              current && "border-primary text-foreground",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
