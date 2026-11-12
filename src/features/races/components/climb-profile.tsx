import type { WalkPortion } from "../grade";

const width = 1000;
const height = 120;

export function ClimbProfile({
  distanceM,
  elevation,
  portions,
  label,
}: {
  distanceM: number;
  elevation: [distanceM: number, ele: number][];
  portions: WalkPortion[];
  label: string;
}) {
  if (elevation.length < 2 || distanceM <= 0) return null;
  const values = elevation.map(([, ele]) => ele);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const x = (meters: number) => (meters / distanceM) * width;
  const y = (ele: number) => height - 6 - ((ele - min) / span) * (height - 18);
  const line = (points: [number, number][]) =>
    points
      .map(
        ([meters, ele], index) =>
          `${index === 0 ? "M" : "L"}${x(meters).toFixed(1)},${y(ele).toFixed(1)}`,
      )
      .join("");
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block h-30 w-full"
    >
      {portions.map((portion) => (
        <rect
          key={`${portion.fromM}-${portion.toM}`}
          x={x(portion.fromM)}
          width={Math.max(2, x(portion.toM) - x(portion.fromM))}
          y={0}
          height={height}
          className="fill-warning/15"
        />
      ))}
      <path
        d={`${line(elevation)}L${width},${height}L0,${height}Z`}
        className="fill-secondary-foreground/15"
      />
      <path
        d={line(elevation)}
        className="fill-none stroke-secondary-foreground"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      {portions.map((portion) => {
        const points = elevation.filter(
          ([meters]) => meters >= portion.fromM && meters <= portion.toM,
        );
        return points.length > 1 ? (
          <path
            key={`line-${portion.fromM}`}
            d={line(points)}
            className="fill-none stroke-warning"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        ) : null;
      })}
    </svg>
  );
}
