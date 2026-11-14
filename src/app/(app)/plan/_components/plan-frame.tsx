import { Suspense } from "react";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { SeasonSheet } from "@/features/app-shell/components/season-menu";
import { cn } from "@/lib/utils";
import { PlanHeaderNav, PlanTabs } from "./plan-tabs";

export function PlanFrame({
  actions,
  className,
  children,
}: {
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader
        title="Plan"
        titleAction={
          <Suspense>
            <SeasonSheet />
          </Suspense>
        }
        breadcrumb={<PlanHeaderNav />}
        actions={actions}
      />
      <PlanTabs />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main
          className={cn(
            "mx-auto flex w-full max-w-360 flex-col gap-7 px-5 pt-3 pb-tab-bar-reserve sm:gap-9 sm:px-[clamp(20px,4vw,56px)] md:pt-10 md:pb-18",
            className,
          )}
        >
          {children}
        </main>
      </div>
    </>
  );
}
