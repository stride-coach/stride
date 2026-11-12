const width = 1000;
const height = 120;

type Range = { fromM: number; toM: number };

export function WeatherProfile({
  distanceM,
  temperatures,
  rain,
  night,
  label,
}: {
  distanceM: number;
  temperatures: { distanceM: number; temperature: number }[];
  rain: Range[];
  night: Range[];
  label: string;
}) {
  if (temperatures.length < 2 || distanceM <= 0) return null;
  const values = temperatures.map((item) => item.temperature);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (meters: number) =>
    (Math.min(meters, distanceM) / distanceM) * width;
  const y = (value: number) =>
    height - 14 - ((value - min) / span) * (height - 30);
  const bands = (ranges: Range[], className: string) =>
    ranges.map((range) => (
      <rect
        key={`${className}-${range.fromM}`}
        x={x(range.fromM)}
        width={Math.max(2, x(range.toM) - x(range.fromM))}
        y={0}
        height={height}
        className={className}
      />
    ));
  const line = temperatures
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"}${x(item.distanceM).toFixed(1)},${y(item.temperature).toFixed(1)}`,
    )
    .join("");
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="block h-30 w-full"
        >
          {bands(night, "fill-muted")}
          {bands(rain, "fill-primary/25")}
          <path
            d={line}
            className="fill-none stroke-foreground"
            strokeWidth={1.75}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="absolute top-0 left-0 text-label text-muted-foreground tabular-nums">
          {Math.round(max)} °C
        </span>
        <span className="absolute bottom-0 left-0 text-label text-muted-foreground tabular-nums">
          {Math.round(min)} °C
        </span>
      </div>
      <p className="flex justify-between text-label text-muted-foreground tabular-nums">
        <span>km 0</span>
        <span>km {Math.round(distanceM / 1000)}</span>
      </p>
    </div>
  );
}
