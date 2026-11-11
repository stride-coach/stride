import { cn } from "@/lib/utils";
import { statusLabels, type ThreadStatus } from "../conversations";

const toneText = {
  accent: "text-primary",
  warning: "text-warning",
  success: "text-primary",
  muted: "text-muted-foreground",
} as const;

export function ThreadStatusLabel({
  status,
  className,
}: {
  status: ThreadStatus;
  className?: string;
}) {
  if (!status) return null;
  const { label, tone } = statusLabels[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-label font-medium",
        toneText[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "working" && "motion-safe:animate-pulse",
        )}
      />
      {label}
    </span>
  );
}
