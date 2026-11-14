import {
  AppHeader,
  type AppCrumb,
} from "@/features/app-shell/components/app-header";

export function RaceFormFrame({
  title,
  crumbs,
  back,
  children,
}: {
  title: string;
  crumbs: AppCrumb[];
  back: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader title={title} crumbs={crumbs} back={back} />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col px-4 pt-4 pb-tab-bar-reserve md:px-5 md:pb-6">
          {children}
        </main>
      </div>
    </>
  );
}
