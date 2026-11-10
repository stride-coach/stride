import { cn } from "@/lib/utils";

export type StatusLevel = "ok" | "watch" | "alert";

const levelTones: Record<StatusLevel, string> = {
  ok: "text-primary",
  watch: "text-warning",
  alert: "text-destructive",
};

export function Status({
  level,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { level: StatusLevel }) {
  return (
    <span
      data-slot="status"
      data-level={level}
      className={cn(
        "inline-flex items-center gap-1.5 text-label font-medium whitespace-nowrap",
        levelTones[level],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
