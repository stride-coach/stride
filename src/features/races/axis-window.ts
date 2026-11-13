export type AxisWindow = { fromM: number; toM: number };

export const minimumWindowM = 5_000;
export const overviewFromM = 60_000;

export function fullWindow(totalM: number): AxisWindow {
  return { fromM: 0, toM: totalM };
}

export function isFullWindow(window: AxisWindow, totalM: number) {
  return window.fromM <= 0 && window.toM >= totalM;
}

function minimumSpan(totalM: number) {
  return Math.min(totalM, minimumWindowM);
}

function clampWindow(fromM: number, spanM: number, totalM: number): AxisWindow {
  const span = Math.min(totalM, Math.max(minimumSpan(totalM), spanM));
  const from = Math.min(totalM - span, Math.max(0, fromM));
  return { fromM: from, toM: from + span };
}

export function zoomWindow(
  window: AxisWindow,
  totalM: number,
  centerM: number,
  factor: number,
): AxisWindow {
  const span = window.toM - window.fromM;
  const next = Math.min(totalM, Math.max(minimumSpan(totalM), span / factor));
  const anchor = span > 0 ? (centerM - window.fromM) / span : 0.5;
  return clampWindow(centerM - anchor * next, next, totalM);
}

export function panWindow(
  window: AxisWindow,
  totalM: number,
  deltaM: number,
): AxisWindow {
  return clampWindow(window.fromM + deltaM, window.toM - window.fromM, totalM);
}

export function centerWindow(
  window: AxisWindow,
  totalM: number,
  centerM: number,
): AxisWindow {
  const span = window.toM - window.fromM;
  return clampWindow(centerM - span / 2, span, totalM);
}

export function resizeWindow(
  window: AxisWindow,
  totalM: number,
  edge: "from" | "to",
  atM: number,
): AxisWindow {
  const span = minimumSpan(totalM);
  if (edge === "from") {
    const from = Math.min(window.toM - span, Math.max(0, atM));
    return { fromM: from, toM: window.toM };
  }
  const to = Math.max(window.fromM + span, Math.min(totalM, atM));
  return { fromM: window.fromM, toM: to };
}

export function windowRatio(window: AxisWindow, distanceM: number) {
  const span = window.toM - window.fromM;
  return span > 0 ? (distanceM - window.fromM) / span : 0;
}

export function showsOverview(window: AxisWindow, totalM: number) {
  return totalM > overviewFromM || !isFullWindow(window, totalM);
}

export function windowLabel(window: AxisWindow) {
  const format = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  return `km ${format.format(window.fromM / 1000)} à ${format.format(window.toM / 1000)}`;
}
