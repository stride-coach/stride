import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { PlanFrame } from "../_components/plan-frame";

export default function Loading() {
  return (
    <PlanFrame
      crumbs={[{ label: "Plan" }]}
      className="max-w-none gap-0 px-0 pt-0 sm:gap-0 sm:px-0 md:pt-0"
    >
      <LoadingScope
        label="Chargement du plan"
        className="flex flex-col xl:flex-row xl:items-start"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            aria-hidden="true"
            className="flex items-center gap-2 border-b border-border px-4 py-2.5 md:px-5"
          >
            <Skeleton className="h-control-auto w-40" />
            <Skeleton className="ml-auto h-control-auto w-24" />
          </div>
          <div aria-hidden="true" className="px-4 pt-4.5 md:px-5">
            <Skeleton className="h-36 w-full" />
          </div>
          <div
            aria-hidden="true"
            className="flex flex-col gap-3 px-4 pt-4.5 md:px-5"
          >
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <ul aria-hidden="true" className="mt-3.5 border-t border-border">
            {Array.from({ length: 7 }, (_, index) => (
              <li
                key={index}
                className="flex min-h-row-touch items-center gap-3 border-b border-border px-4 sm:min-h-row md:px-5"
              >
                <Skeleton className="size-3.5 rounded-full" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="ml-auto h-3 w-12" />
              </li>
            ))}
          </ul>
        </div>
        <aside
          aria-hidden="true"
          className="flex flex-col gap-3 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
        >
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </aside>
      </LoadingScope>
    </PlanFrame>
  );
}
