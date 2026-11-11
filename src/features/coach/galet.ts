import type { StaffAgent } from "./staff";

export type GaletState = "idle" | "think" | "speak";

const seeds: Record<StaffAgent, readonly [number, number, number]> = {
  coach: [0, 3, 5],
  medical: [1.3, 2, 4],
  director: [2.1, 4, 3],
  strategist: [3.4, 3, 2],
  nutritionist: [4.6, 5, 3],
};

const offsets: Record<StaffAgent, number> = {
  coach: 0,
  medical: 1.7,
  director: 3.4,
  strategist: 5.1,
  nutritionist: 6.8,
};

const points = 72;

function ring(
  radius: number,
  seed: readonly [number, number, number],
  time: number,
  amplitude: number,
  rotation: number,
) {
  const coordinates: string[] = [];
  for (let index = 0; index < points; index++) {
    const angle = (index / points) * Math.PI * 2;
    const length =
      radius *
      (1 +
        amplitude *
          (0.62 * Math.sin(seed[1] * angle + seed[0] + time) +
            0.38 * Math.sin(seed[2] * angle - seed[0] - time * 0.7)));
    coordinates.push(
      `${(50 + length * Math.cos(angle + rotation)).toFixed(1)},${(50 + length * Math.sin(angle + rotation)).toFixed(1)}`,
    );
  }
  return coordinates.join(" ");
}

function voice(time: number) {
  return 0.5 + 0.5 * Math.sin(time * 9) * Math.sin(time * 2.3 + 1);
}

export type GaletFrame = {
  body: string;
  halo: string;
  haloOpacity: number;
  eyeHeight: number;
  eyeY: number;
  eyeShift: { x: number; y: number };
};

export function galetFrame(
  agent: StaffAgent,
  state: GaletState,
  seconds: number,
  blinking = true,
): GaletFrame {
  const time = seconds + offsets[agent];
  const seed = seeds[agent];
  const level = state === "speak" ? voice(time) : 0;
  const amplitude = state === "think" ? 0.14 : 0.09;
  const speed = state === "think" ? 1.8 : 0.45;
  const blink = blinking && time % 4.2 < 0.14 ? 0.12 : 1;
  const eyeHeight = (state === "speak" ? 11 : 16) * blink;
  return {
    body: ring(
      34 * (1 + 0.05 * level),
      seed,
      time * speed,
      amplitude,
      state === "think" ? time * 0.35 : 0,
    ),
    halo: ring(41 + 4 * level, seed, time * speed, amplitude, 0),
    haloOpacity: state === "speak" ? 0.25 + 0.6 * level : 0,
    eyeHeight,
    eyeY: 48 - eyeHeight / 2,
    eyeShift:
      state === "think"
        ? { x: -5 + 2 * Math.sin(time * 0.9), y: -6 }
        : { x: 0, y: 0 },
  };
}
