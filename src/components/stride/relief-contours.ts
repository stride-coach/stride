export type ReliefContour = { points: string; strong: boolean };

const samples = 96;
const easeSeconds = 0.67;

export const reliefRestSpeed = 0.24;
export const reliefBusySpeed = 0.6;

export function reliefSpeed(
  current: number,
  busy: boolean,
  elapsedSeconds: number,
) {
  const target = busy ? reliefBusySpeed : reliefRestSpeed;
  return target + (current - target) * Math.exp(-elapsedSeconds / easeSeconds);
}
const verticalScale = 1.05;

export function reliefContours({
  cx,
  cy,
  count,
  step,
  phase = 0,
}: {
  cx: number;
  cy: number;
  count: number;
  step: number;
  phase?: number;
}): ReliefContour[] {
  return Array.from({ length: count }, (_, index) => {
    const ring = index + 1;
    const radius = ring * step;
    const points = Array.from({ length: samples }, (_, sample) => {
      const angle = (sample / samples) * Math.PI * 2;
      const wobble =
        1 +
        (0.05 + 0.004 * ring) * Math.sin(3 * angle + 0.33 * ring + phase) +
        0.045 * Math.sin(5 * angle - 0.5 * ring - 0.7 * phase) +
        0.03 * Math.sin(2 * angle + 1.3 + 0.4 * phase);
      const x = cx + Math.cos(angle) * radius * wobble;
      const y = cy + Math.sin(angle) * radius * wobble * verticalScale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { points: points.join(" "), strong: ring % 4 === 0 };
  });
}
