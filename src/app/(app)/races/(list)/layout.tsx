import Link from "next/link";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { localToday } from "@/features/app-shell/shell";
import { RacesTabs } from "@/features/races/components/races-tabs";
import { seasonLabel } from "@/features/races/overview";

export default function RacesListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const season = seasonLabel(localToday(new Date()));
  return (
    <>
      <AppHeader
        title="Courses"
        detail={season}
        breadcrumb={
          <Suspense>
            <RacesTabs season={season} />
          </Suspense>
        }
        actions={
          <Button asChild variant="outline" className="shrink-0 max-md:hidden">
            <Link href="/races/new">
              <span aria-hidden="true">+</span>
              <span className="max-sm:sr-only">Ajouter une course</span>
            </Link>
          </Button>
        }
      />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-18 md:pb-6">{children}</main>
      </div>
    </>
  );
}
