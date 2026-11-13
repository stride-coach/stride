export type AxisLabel = { at: number; width: number; priority?: number };

export function fitLabels(
  labels: readonly AxisLabel[],
  containerPx: number,
  gapPx = 6,
): boolean[] {
  const shown = labels.map(() => false);
  const taken: { from: number; to: number }[] = [];
  const order = labels
    .map((label, index) => ({ label, index }))
    .sort(
      (left, right) =>
        (right.label.priority ?? 0) - (left.label.priority ?? 0) ||
        left.index - right.index,
    );
  for (const { label, index } of order) {
    const from = placeLabel(label.at, label.width, containerPx);
    const to = from + label.width;
    if (taken.some((span) => from < span.to + gapPx && to > span.from - gapPx))
      continue;
    taken.push({ from, to });
    shown[index] = true;
  }
  return shown;
}

export function labelWidth(text: string, charPx = 6.5) {
  return Math.ceil(text.length * charPx) + 4;
}

export function placeLabel(at: number, width: number, containerPx: number) {
  const center = at * containerPx;
  return Math.max(0, Math.min(containerPx - width, center - width / 2));
}
