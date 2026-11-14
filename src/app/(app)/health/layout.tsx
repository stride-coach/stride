import { AppHeader } from "@/features/app-shell/components/app-header";
import {
  HealthHeaderNav,
  HealthTabs,
} from "@/features/progress/components/progress-nav";

export default function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader title="Santé" breadcrumb={<HealthHeaderNav />} />
      <HealthTabs />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-tab-bar-reserve md:pb-6">{children}</main>
      </div>
    </>
  );
}
