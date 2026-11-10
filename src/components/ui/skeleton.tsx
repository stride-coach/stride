import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "rounded-md bg-muted bg-linear-to-r from-muted via-border to-muted bg-size-[200%_100%] motion-safe:animate-data-sheen",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
