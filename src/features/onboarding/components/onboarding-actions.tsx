import { cn } from "@/lib/utils";

export function OnboardingActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-4 mt-auto -mb-6 flex flex-col gap-3 border-t border-border bg-background px-4 pt-3 pb-6 lg:static lg:m-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4 lg:border-0 lg:bg-transparent lg:p-0",
        className,
      )}
      {...props}
    />
  );
}
