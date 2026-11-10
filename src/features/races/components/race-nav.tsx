"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { fullscreenMapParam } from "../map";

export const raceSections = [
  { path: "", label: "Parcours" },
  { path: "/roadbook", label: "Stratégie" },
  { path: "/nutrition", label: "Alimentation" },
  { path: "/gear", label: "Équipement" },
] as const;

const roadSections = [
  raceSections[0],
  { path: "/gear", label: "Check-lists" },
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
  return { tab: section?.path ?? "", crumb: null };
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
      className="flex min-w-0 shrink items-center gap-2 text-body"
    >
      <Link
        href="/races"
        className="text-muted-foreground hover:text-foreground"
      >
        Courses
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        ›
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
            ›
          </span>
          <span aria-current="page" className="truncate">
            {label}
          </span>
        </>
      ) : (
        <span aria-current="page" className="truncate font-medium">
          {name}
        </span>
      )}
    </nav>
  );
}

export function RaceTabs({
  raceId,
  kind,
  variant,
}: {
  raceId: string;
  kind: "road" | "trail";
  variant: "header" | "pills";
}) {
  const pathname = usePathname();
  const base = `/races/${raceId}`;
  const { tab } = sectionOf(pathname, base, kind);
  const sections = sectionsOf(kind);
  const header = variant === "header";
  return (
    <nav
      aria-label="Sections de la course"
      className={cn(
        "print:hidden",
        header
          ? "flex min-w-0 items-stretch gap-5 self-stretch"
          : "flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5 md:hidden",
      )}
    >
      {sections.map((section) => {
        const current = section.path === tab;
        return (
          <Link
            key={section.path}
            href={`${base}${section.path}`}
            aria-current={current ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap transition-colors duration-150 ease-stride",
              header
                ? "flex items-center border-b-2 px-0.5 focus-visible:outline-offset-[-2px]"
                : "inline-flex min-h-control-touch items-center rounded-full border px-3",
              header
                ? current
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                : current
                  ? "border-control-border bg-muted font-medium text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
