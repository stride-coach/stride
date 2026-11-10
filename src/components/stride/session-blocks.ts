export type Zone = 1 | 2 | 3 | 4 | 5;

export type SessionBlock = {
  minutes: number;
  zone: Zone;
  removed?: boolean;
  free?: boolean;
};

export const zoneHeights: Record<Zone, number> = {
  1: 22,
  2: 40,
  3: 100,
  4: 100,
  5: 100,
};

export function isWorkZone(zone: Zone) {
  return zone >= 3;
}

export function summarizeSession(blocks: readonly SessionBlock[]) {
  const kept = blocks.filter((block) => !block.removed);
  const removed = blocks.filter((block) => block.removed);
  const minutes = (list: readonly SessionBlock[]) =>
    list.reduce((total, block) => total + Math.max(0, block.minutes), 0);
  const hardest = kept.reduce<Zone | undefined>(
    (zone, block) =>
      zone === undefined || block.zone > zone ? block.zone : zone,
    undefined,
  );
  const parts = [`${minutes(kept)} minutes`];
  if (hardest !== undefined) parts.push(`jusqu’en zone ${hardest}`);
  if (removed.length > 0)
    parts.push(
      `${removed.length} ${removed.length === 1 ? "bloc retiré" : "blocs retirés"} (${minutes(removed)} minutes)`,
    );
  return `Structure de la séance : ${parts.join(", ")}`;
}
