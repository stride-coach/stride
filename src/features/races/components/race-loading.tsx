import { AppHeader } from "@/features/app-shell/components/app-header";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";

export function RaceEntryLoading() {
  return (
    <>
      <AppHeader
        title="Courses"
        back={{ href: "/races", label: "Retour aux courses" }}
        className="print:hidden"
        breadcrumb={
          <nav
            aria-label="Fil d’Ariane"
            className="flex min-w-0 flex-1 items-center gap-2 text-body"
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
            <Skeleton aria-hidden="true" className="h-4 w-40" />
          </nav>
        }
      />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="mx-auto flex w-full max-w-360 flex-col px-5 pt-3 pb-18 sm:px-[clamp(20px,4vw,56px)] md:pt-9">
          <LoadingScope
            label="Chargement de la course"
            className="flex flex-col gap-5 sm:gap-9"
          >
            <div
              aria-hidden="true"
              className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6"
            >
              <div className="flex flex-col gap-3 md:gap-2.5">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-7.5 w-72 max-w-full md:h-10" />
                <Skeleton className="h-11 w-48" />
              </div>
              <div className="flex flex-col gap-5 md:items-end md:gap-3.5">
                <Skeleton className="h-30 w-full rounded-xl md:h-11 md:w-110" />
                <Skeleton className="h-11 w-full md:h-9.5 md:w-120" />
              </div>
            </div>
            <Skeleton aria-hidden="true" className="h-56 w-full rounded-2xl" />
            <Skeleton
              aria-hidden="true"
              className="h-56 w-full rounded-2xl md:h-105"
            />
          </LoadingScope>
        </main>
      </div>
    </>
  );
}
