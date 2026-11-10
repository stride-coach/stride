import { cn } from "@/lib/utils";
import type { ActivityPill, PillTone } from "@/features/activities/plan-status";

const tones: Record<PillTone, { pill: string; dot: string }> = {
  success: { pill: "border-border text-primary", dot: "bg-primary" },
  warning: { pill: "border-border text-warning", dot: "bg-warning" },
  off: {
    pill: "border-control-border text-secondary-foreground",
    dot: "border-[1.5px] border-muted-foreground",
  },
  todo: { pill: "border-primary/30 text-primary", dot: "bg-primary" },
};

export function PlanPill({
  pill,
  className,
}: {
  pill: ActivityPill;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.25 py-1 text-[11.5px] leading-none whitespace-nowrap",
        tones[pill.tone].pill,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", tones[pill.tone].dot)}
      />
      {pill.label}
    </span>
  );
}
