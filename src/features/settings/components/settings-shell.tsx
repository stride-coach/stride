"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Relief } from "@/components/stride/relief";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useDataActivity } from "@/features/data-activity/components/provider";
import {
  DataActivityStatus,
  DataActivityThread,
} from "@/features/data-activity/components/status";
import { activityTone } from "@/features/data-activity/model";
import { MobileHeaderActions } from "@/features/app-shell/components/mobile-header-actions";
import { ShellIdentityProvider } from "@/features/app-shell/components/shell-identity";
import { ShortcutHelp } from "@/features/app-shell/components/shortcut-help";
import { TopBar } from "@/features/app-shell/components/top-bar";
import type {
  ShellAthlete,
  ShellGoal,
  ShellSeason,
} from "@/features/app-shell/shell";
import { settingsHref, settingsSections } from "../navigation";

const toneDots = {
  success: "bg-primary",
  warning: "bg-warning",
  danger: "bg-destructive",
  provider: "bg-muted-foreground",
} as const;

function GarminState() {
  const activity = useDataActivity();
  if (!activity) return null;
  const tone = activityTone(activity.state);
  return (
    <span className="ml-auto flex items-center gap-1.5 text-label font-normal text-muted-foreground">
      {activity.state !== "checking" && (
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", toneDots[tone])}
        />
      )}
      Garmin
    </span>
  );
}

function SettingsNav({ active }: { active: string | undefined }) {
  return (
    <aside className="flex w-sidebar shrink-0 flex-col gap-4 px-2.5 pt-2 pb-3 max-lg:hidden print:hidden">
      <Link
        href="/today"
        className="flex min-h-control items-center gap-1.5 rounded-md px-2 font-medium transition-colors duration-150 ease-stride hover:bg-muted"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-3.5" />
        Retour à Stride
      </Link>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {(["You", "Data"] as const).map((group) => (
          <div key={group} className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 text-label text-muted-foreground">
              {group === "You" ? "Toi" : "Données"}
            </p>
            <nav
              aria-label={
                group === "You" ? "Réglages personnels" : "Réglages des données"
              }
              className="flex flex-col gap-0.5"
            >
              {settingsSections
                .filter((section) => section.group === group)
                .map((section) => {
                  const current = active === section.slug;
                  return (
                    <Link
                      key={section.slug}
                      href={settingsHref(section.slug)}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex min-h-control items-center gap-2 rounded-md px-2 transition-colors duration-150 ease-stride hover:bg-muted",
                        current
                          ? "bg-muted font-medium text-foreground"
                          : "text-secondary-foreground hover:text-foreground",
                      )}
                    >
                      {section.label}
                      {section.slug === "connections" && <GarminState />}
                    </Link>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>
      <div data-slot="settings-account" className="mt-auto px-2">
        <DataActivityStatus className="text-label" />
      </div>
    </aside>
  );
}

export function SettingsShell({
  athlete,
  goal,
  seasons,
  modelDetail,
  children,
}: {
  athlete: ShellAthlete;
  goal: ShellGoal | null;
  seasons: Promise<ShellSeason[]>;
  modelDetail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname, search]);
  const garmin = pathname === "/settings/connections/garmin";
  const section = settingsSections.find(
    (item) =>
      settingsHref(item.slug) === pathname ||
      (garmin && item.slug === "connections"),
  );
  const overview = section?.slug === "";
  const label = section?.label ?? "Réglages";
  return (
    <ShellIdentityProvider value={{ athlete, goal, seasons, modelDetail }}>
      <SidebarProvider
        open
        onOpenChange={() => {}}
        className="relative h-svh flex-col overflow-hidden bg-background md:bg-shell"
      >
        <ShortcutHelp />
        <Relief corner="top-right" className="max-md:hidden print:hidden" />
        <Relief corner="bottom-left" className="max-md:hidden print:hidden" />
        <TopBar
          athlete={athlete}
          goal={goal}
          modelDetail={modelDetail}
          sidebarToggle={false}
        />
        <div className="relative flex min-h-0 flex-1">
          <SettingsNav active={section?.slug} />
          <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background md:mr-2 md:mb-2 md:rounded-xl md:border md:border-border md:bg-background/70">
            <header className="relative flex h-13 shrink-0 items-center gap-2 border-b border-border px-4 md:h-header md:gap-3 md:px-5">
              {!overview && (
                <Link
                  href={garmin ? "/settings/connections" : "/settings"}
                  aria-label={
                    garmin ? "Retour aux connexions" : "Retour aux réglages"
                  }
                  className="-ml-3 grid size-control-touch shrink-0 place-items-center rounded-md text-secondary-foreground hover:text-foreground lg:hidden"
                >
                  <ChevronLeftIcon aria-hidden="true" className="size-5" />
                </Link>
              )}
              {overview && (
                <Link
                  href="/today"
                  aria-label="Retour à Stride"
                  className="-ml-3 grid size-control-touch shrink-0 place-items-center rounded-md text-secondary-foreground hover:text-foreground lg:hidden"
                >
                  <ChevronLeftIcon aria-hidden="true" className="size-5" />
                </Link>
              )}
              <nav
                aria-label="Fil d’Ariane"
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                {overview ? (
                  <span className="truncate font-semibold max-md:text-body-lg md:font-normal md:text-secondary-foreground">
                    Réglages
                  </span>
                ) : (
                  <Link
                    href="/settings"
                    className="text-secondary-foreground hover:text-foreground max-md:hidden"
                  >
                    Réglages
                  </Link>
                )}
                <span
                  aria-hidden="true"
                  className="text-muted-foreground max-md:hidden"
                >
                  ›
                </span>
                {garmin ? (
                  <>
                    <Link
                      href="/settings/connections"
                      className="text-secondary-foreground hover:text-foreground max-md:hidden"
                    >
                      {label}
                    </Link>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground max-md:hidden"
                    >
                      ›
                    </span>
                    <span aria-current="page" className="truncate font-medium">
                      Garmin
                    </span>
                  </>
                ) : (
                  <span
                    aria-current="page"
                    className={cn(
                      "truncate font-medium",
                      overview && "max-md:hidden",
                      !overview && "max-md:text-body-lg max-md:font-semibold",
                    )}
                  >
                    {label}
                  </span>
                )}
              </nav>
              <MobileHeaderActions />
              <DataActivityThread />
            </header>
            <div
              ref={scroller}
              className="relative min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain"
            >
              <div
                data-slot="settings-content"
                className="mx-auto w-full max-w-180 px-4 pt-5 pb-18 md:px-5 md:pt-8 md:pb-12"
              >
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ShellIdentityProvider>
  );
}

export function SettingsHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-1.5">
      <h1 className="text-verdict font-semibold text-balance">{title}</h1>
      {description && (
        <p className="text-body-lg text-pretty text-secondary-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

export function SettingsLinkRow({
  href,
  title,
  detail,
  detailLead,
}: {
  href: string;
  title: string;
  detail: string;
  detailLead?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="grid min-h-row-touch grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-3 gap-y-0.5 border-b border-border py-3 transition-colors duration-150 ease-stride hover:bg-muted md:grid-cols-[12.5rem_minmax(0,1fr)_1rem] md:gap-x-5 md:py-4.5"
    >
      <strong className="min-w-0 font-semibold">{title}</strong>
      <span className="row-start-2 min-w-0 truncate text-label text-secondary-foreground md:row-start-auto md:text-body">
        {detailLead}
        {detail}
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="col-start-2 row-span-2 row-start-1 size-4 shrink-0 text-muted-foreground md:col-start-3 md:row-span-1"
      />
    </Link>
  );
}
