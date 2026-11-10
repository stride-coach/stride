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
            className="flex min-w-0 items-center gap-2 text-body"
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
            <Skeleton aria-hidden="true" className="h-4 w-40" />
          </nav>
        }
      />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-18 md:pb-6">
          <LoadingScope
            label="Chargement de la course"
            className="flex flex-col"
          >
            <div
              aria-hidden="true"
              className="flex flex-col gap-3.5 border-b border-border px-4 py-4.5 md:px-5"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-5.5 rounded-sm" />
                <Skeleton className="h-6 w-64 max-w-full" />
                <Skeleton className="ml-auto h-5 w-32 max-sm:hidden" />
              </div>
              <div className="grid grid-cols-3 gap-4 border-y border-border py-3.5 sm:grid-cols-5">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex flex-col gap-1.5">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-control-auto w-48" />
            </div>
            <div
              aria-hidden="true"
              className="flex flex-col gap-5 px-4 py-4.5 md:gap-6 md:px-5"
            >
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl md:h-105" />
            </div>
          </LoadingScope>
        </main>
      </div>
    </>
  );
}
