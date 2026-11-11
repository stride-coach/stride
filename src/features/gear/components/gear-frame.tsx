import { cn } from "@/lib/utils";
import {
  AppHeader,
  type AppCrumb,
} from "@/features/app-shell/components/app-header";
import { MobileHeaderActions } from "@/features/app-shell/components/mobile-header-actions";
import { ActivityTabs } from "@/features/activities/components/activity-frame";
import {
  DataActivityStatus,
  DataActivityThread,
} from "@/features/data-activity/components/status";

export function GearFrame({
  crumbs,
  breadcrumb,
  back,
  aside,
  asideFirst = false,
  children,
}: {
  crumbs: AppCrumb[];
  breadcrumb?: React.ReactNode;
  back?: { href: string; label: string };
  aside?: React.ReactNode;
  asideFirst?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader
        title="Matériel"
        crumbs={crumbs}
        breadcrumb={breadcrumb}
        back={back}
      />
      <GearScroll aside={aside} asideFirst={asideFirst}>
        {children}
      </GearScroll>
    </>
  );
}

export function GearListFrame({
  actions,
  aside,
  children,
}: {
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="relative flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:flex-wrap md:items-center md:gap-x-5 md:gap-y-2 md:px-5 md:py-0">
        <div className="flex items-center gap-2 md:self-stretch">
          <p className="flex-1 text-body-lg font-semibold md:flex md:items-center md:text-body">
            Activités
          </p>
          <DataActivityStatus compact className="shrink-0 md:hidden" />
          <MobileHeaderActions />
        </div>
        <ActivityTabs current="gear" />
        {actions && (
          <div className="flex flex-wrap gap-2 md:ml-auto md:py-2 max-md:[&>*]:flex-1">
            {actions}
          </div>
        )}
        <DataActivityThread />
      </div>
      <GearScroll aside={aside}>{children}</GearScroll>
    </>
  );
}

function GearScroll({
  aside,
  asideFirst = false,
  children,
}: {
  aside?: React.ReactNode;
  asideFirst?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
      <main className="flex w-full flex-col pb-18 md:pb-6 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4.5 md:px-5">
          {children}
        </div>
        {aside && (
          <aside
            aria-label="Repères du matériel"
            className={cn(
              "flex flex-col px-4 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border",
              asideFirst &&
                "max-xl:order-first max-xl:border-b max-xl:border-border",
            )}
          >
            {aside}
          </aside>
        )}
      </main>
    </div>
  );
}

export function GearPanelSection({
  id,
  title,
  children,
}: {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-2.5 border-b border-border py-4.5 last:border-b-0"
    >
      <h2 id={id} className="text-label font-medium text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
