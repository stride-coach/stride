"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { fullscreenMapParam } from "../map";

type RaceKind = "road" | "trail";

export const raceSections = [
  { path: "", label: "Plan de course" },
  { path: "/nutrition", label: "Ravitaillement" },
  { path: "/gear", label: "Équipement" },
  { path: "/preparation", label: "Préparation" },
] as const;

const roadSections = [
  raceSections[0],
  raceSections[2],
  raceSections[3],
] as const;

export const raceViews = [
  { path: "", label: "Plan" },
  { path: "/scenarios", label: "Scénarios" },
] as const;

function sectionsOf(kind: RaceKind) {
  return kind === "road" ? roadSections : raceSections;
}

const extraCrumbs: Record<string, { crumb: string; tab: string }> = {
  "/waypoints": { crumb: "Points de passage", tab: "" },
  "/course": { crumb: "Ajouter le GPX", tab: "" },
};

function sectionOf(pathname: string, base: string, kind: RaceKind) {
  const rest = pathname.slice(base.length).replace(/\/$/, "");
  const extra = extraCrumbs[rest];
  if (extra) return { tab: extra.tab, view: null, crumb: extra.crumb };
  const view =
    kind === "trail"
      ? (raceViews.find((item) => item.path === rest)?.path ?? null)
      : null;
  if (view !== null) return { tab: "", view, crumb: null };
  const section = sectionsOf(kind).find((item) => item.path === rest);
  return { tab: section?.path ?? "", view: null, crumb: null };
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
  kind: RaceKind;
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
        <span
          aria-current={
            pathname.replace(/\/$/, "") === base ? "page" : undefined
          }
          className="truncate font-medium"
        >
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
  kind: RaceKind;
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

export function RaceViews({
  raceId,
  kind,
  variant,
}: {
  raceId: string;
  kind: RaceKind;
  variant: "header" | "row";
}) {
  const pathname = usePathname();
  const base = `/races/${raceId}`;
  const { view } = sectionOf(pathname, base, kind);
  if (view === null) return null;
  const header = variant === "header";
  return (
    <nav
      aria-label="Vues du plan de course"
      className={cn(
        "print:hidden",
        header
          ? "flex shrink-0 gap-0.5 rounded-lg border border-border bg-card p-0.5 max-lg:hidden"
          : "flex gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden",
      )}
    >
      {raceViews.map((item) => {
        const current = item.path === view;
        return (
          <Link
            key={item.path}
            href={`${base}${item.path}`}
            aria-current={current ? "page" : undefined}
            scroll={false}
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-2.5 whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground",
              header ? "min-h-6" : "min-h-control-touch",
              current && "bg-muted font-medium text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
