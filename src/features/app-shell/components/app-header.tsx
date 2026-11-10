import { ChevronLeftIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  DataActivityStatus,
  DataActivityThread,
} from "@/features/data-activity/components/status";
import { cn } from "@/lib/utils";
import { MobileHeaderActions } from "./mobile-header-actions";

export type AppCrumb = { label: string; href?: string };

function Crumbs({ crumbs, detail }: { crumbs: AppCrumb[]; detail?: string }) {
  return (
    <nav
      aria-label="Fil d’Ariane"
      className="flex min-w-0 items-center gap-2 text-body"
    >
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <span key={crumb.label} className="flex min-w-0 items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="text-muted-foreground">
                /
              </span>
            )}
            {crumb.href && !last ? (
              <Link
                href={crumb.href}
                className="truncate text-muted-foreground hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                aria-current={last ? "page" : undefined}
                className={last ? "truncate" : "truncate text-muted-foreground"}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
      {detail && (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="truncate text-muted-foreground">{detail}</span>
        </>
      )}
    </nav>
  );
}

export function AppHeader({
  title,
  detail,
  crumbs,
  breadcrumb,
  back,
  actions,
  className,
}: {
  title: string;
  detail?: string;
  crumbs?: AppCrumb[];
  breadcrumb?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative flex h-13 shrink-0 items-center gap-2 border-b border-border px-4 md:h-header md:gap-3 md:px-5",
        className,
      )}
    >
      {back && (
        <Link
          href={back.href}
          aria-label={back.label}
          className="-my-1.5 -ml-3 grid size-11 shrink-0 place-items-center rounded-md text-secondary-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:hidden"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 items-baseline gap-2 md:hidden">
        <p className="truncate text-body-lg font-semibold">{title}</p>
        {detail && !back && (
          <span className="truncate text-muted-foreground">{detail}</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 max-md:hidden">
        {breadcrumb ?? (
          <Crumbs crumbs={crumbs ?? [{ label: title }]} detail={detail} />
        )}
      </div>
      {actions}
      <DataActivityStatus short className="shrink-0 md:hidden" />
      <MobileHeaderActions />
      <DataActivityThread />
    </header>
  );
}
