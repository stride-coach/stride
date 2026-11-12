import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { PlanFrame } from "../_components/plan-frame";

export default function Loading() {
  return (
    <PlanFrame className="max-w-none gap-0 px-0 pt-0 sm:gap-0 sm:px-0 md:pt-0">
      <LoadingScope
        label="Chargement du calendrier"
        className="flex flex-col xl:flex-row xl:items-start"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            aria-hidden="true"
            className="flex items-center gap-3 px-4 pt-4 pb-3 md:px-5"
          >
            <Skeleton className="h-7 w-40" />
            <Skeleton className="ml-auto h-control-auto w-36" />
          </div>
          <div
            aria-hidden="true"
            className="grid grid-cols-7 gap-px px-2 md:px-0"
          >
            {Array.from({ length: 35 }, (_, index) => (
              <Skeleton key={index} className="h-11 rounded-none md:h-30" />
            ))}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="flex flex-col gap-3 px-5 py-4.5 max-xl:hidden xl:w-panel xl:border-l xl:border-border"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-24 w-full" />
        </div>
      </LoadingScope>
    </PlanFrame>
  );
}
