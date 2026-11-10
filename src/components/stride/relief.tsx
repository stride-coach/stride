import { reliefContours } from "@/components/stride/relief-contours";
import { cn } from "@/lib/utils";

const corners = {
  "top-right": {
    width: 1040,
    height: 760,
    contours: reliefContours({
      cx: 900,
      cy: -40,
      count: 14,
      base: 34,
      step: 30,
      phase: 0.6,
    }),
    position: "top-0 right-0",
    mask: "[mask-image:radial-gradient(100%_100%_at_100%_0%,#000_0%,rgb(0_0_0/0.9)_35%,rgb(0_0_0/0.4)_65%,transparent_100%)]",
  },
  "bottom-left": {
    width: 520,
    height: 560,
    contours: reliefContours({
      cx: 60,
      cy: 600,
      count: 10,
      base: 30,
      step: 28,
      phase: 2.1,
    }),
    position: "bottom-0 left-0",
    mask: "[mask-image:radial-gradient(100%_100%_at_0%_100%,#000_0%,rgb(0_0_0/0.9)_35%,rgb(0_0_0/0.4)_65%,transparent_100%)]",
  },
} as const;

export function Relief({
  corner,
  className,
}: {
  corner: keyof typeof corners;
  className?: string;
}) {
  const { width, height, contours, position, mask } = corners[corner];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-slot="relief"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn(
        "pointer-events-none absolute fill-none",
        position,
        mask,
        className,
      )}
    >
      <g className="motion-safe:animate-relief-drift">
        {contours.map((contour, index) => (
          <polygon
            key={index}
            points={contour.points}
            className={
              contour.strong
                ? "stroke-relief-strong stroke-[1.4]"
                : "stroke-relief stroke-1"
            }
          />
        ))}
      </g>
    </svg>
  );
}
