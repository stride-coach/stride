export type ReliefContour = { points: string; strong: boolean };

const samples = 72;

export function reliefContours({
  cx,
  cy,
  count,
  base,
  step,
  phase,
}: {
  cx: number;
  cy: number;
  count: number;
  base: number;
  step: number;
  phase: number;
}): ReliefContour[] {
  return Array.from({ length: count }, (_, ring) => {
    const radius = base + ring * step;
    const points = Array.from({ length: samples }, (_, index) => {
      const angle = (index / samples) * Math.PI * 2;
      const wobble =
        1 +
        0.09 * Math.sin(2 * angle + phase + ring * 0.28) +
        0.05 * Math.sin(3 * angle + phase * 1.7 - ring * 0.17) +
        0.03 * Math.sin(5 * angle + phase * 0.6 + ring * 0.41);
      const x = cx + Math.cos(angle) * radius * wobble;
      const y = cy + Math.sin(angle) * radius * wobble * 0.86;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { points: points.join(" "), strong: ring % 4 === 3 };
  });
}
