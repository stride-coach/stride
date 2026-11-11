import { cn } from "@/lib/utils";
import { describeProgress, type StepStatus } from "@/components/stride/steps";

export function StepperSegments({
  statuses,
  currentProgress = 0,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  statuses: readonly StepStatus[];
  currentProgress?: number;
}) {
  const { position, total, label } = describeProgress(statuses);
  const fill = Math.min(Math.max(currentProgress, 0), 1) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={position}
      aria-valuetext={label}
      aria-label="Progression"
      data-slot="stepper-segments"
      className={cn("grid auto-cols-fr grid-flow-col gap-1", className)}
      {...props}
    >
      {statuses.map((status, index) => (
        <span
          key={index}
          data-status={status}
          className={cn(
            "relative h-0.75 overflow-hidden rounded-mark",
            status === "done" && "bg-primary",
            status === "background" && "bg-data-1",
            status === "current" && "bg-border",
            status === "upcoming" && "bg-border",
          )}
        >
          {status === "current" && (
            <span
              className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-320 ease-stride"
              style={{ width: `${fill}%` }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
