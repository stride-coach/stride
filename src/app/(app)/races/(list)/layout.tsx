import Link from "next/link";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { Button } from "@/components/ui/button";

export default function RacesListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader
        title="Courses"
        actions={
          <Button asChild variant="outline" className="shrink-0">
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
