export type PlageScale = {
  min: number;
  max: number;
  low: number;
  high: number;
  value: number;
};

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function plagePositions({ min, max, low, high, value }: PlageScale) {
  const span = max - min;
  const finite = [min, max, low, high, value].every(Number.isFinite);
  if (!finite || !(span > 0))
    return { bandStart: 0, bandWidth: 100, point: 50 };
  const toPercent = (input: number) =>
    clampPercent(((input - min) / span) * 100);
  const bandStart = toPercent(Math.min(low, high));
  const bandEnd = toPercent(Math.max(low, high));
  return {
    bandStart,
    bandWidth: bandEnd - bandStart,
    point: toPercent(value),
  };
}
