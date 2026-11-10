import {
  plagePositions,
  type PlageScale,
} from "@/components/stride/plage-scale";
import { Status, type StatusLevel } from "@/components/stride/status";
import { cn } from "@/lib/utils";

const pointTones: Record<StatusLevel, string> = {
  ok: "bg-primary",
  watch: "bg-warning",
  alert: "bg-destructive",
};

export function PlageTrack({
  scale,
  level,
  threshold,
  className,
}: {
  scale: PlageScale;
  level: StatusLevel;
  threshold?: number | null;
  className?: string;
}) {
  const { bandStart, bandWidth, point } = plagePositions(scale);
  const limit =
    threshold === undefined || threshold === null
      ? null
      : plagePositions({ ...scale, value: threshold }).point;
  return (
    <div
      aria-hidden="true"
      data-slot="plage-track"
      className={cn(
        "relative h-4.5 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-control-border",
        className,
      )}
    >
      <span
        className="absolute inset-y-0 border-x-2 border-primary bg-accent"
        style={{ left: `${bandStart}%`, width: `${bandWidth}%` }}
      />
      {limit !== null && (
        <span
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-mark bg-destructive"
          style={{ left: `${limit}%` }}
        />
      )}
      <span
        className={cn(
          "absolute top-1/2 size-2.75 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--card)]",
          pointTones[level],
        )}
        style={{ left: `${point}%` }}
      />
    </div>
  );
}

export function Plage({
  name,
  range,
  value,
  level,
  verdict,
  scale,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  name: React.ReactNode;
  range: React.ReactNode;
  value: React.ReactNode;
  level: StatusLevel;
  verdict: React.ReactNode;
  scale: PlageScale;
}) {
  return (
    <div
      data-slot="plage"
      className={cn(
        "grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3.5 py-2.75",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-secondary-foreground">{name}</span>
        <span className="text-label text-muted-foreground tabular-nums">
          <span className="sr-only">Ta plage : </span>
          {range}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2.25 gap-y-0.5">
          <b className="text-body-lg font-semibold whitespace-nowrap tabular-nums">
            {value}
          </b>
          <Status level={level}>{verdict}</Status>
        </span>
        <PlageTrack scale={scale} level={level} />
      </span>
    </div>
  );
}
