export type RevealNode = {
  tagName: string;
  isConnected: boolean;
  parentElement: RevealNode | null;
  children: ArrayLike<RevealNode>;
};

type RevealStep = {
  node: RevealNode;
  parent: RevealNode;
  siblings: RevealNode[];
};

export type RevealPath = RevealStep[];

export function revealPath(scope: RevealNode, root: RevealNode): RevealPath {
  const path: RevealPath = [];
  let current = scope;
  while (current !== root && current.parentElement) {
    const parent = current.parentElement;
    path.push({ node: current, parent, siblings: Array.from(parent.children) });
    current = parent;
  }
  return path;
}

function counterpart(step: RevealStep) {
  const removed = step.siblings.filter((sibling) => !sibling.isConnected);
  const fromEnd = removed.length - 1 - removed.indexOf(step.node);
  const added = Array.from(step.parent.children).filter(
    (child) => !step.siblings.includes(child),
  );
  return added[added.length - 1 - fromEnd];
}

export function replacementOf(path: RevealPath): RevealNode | null {
  const kept = path.findIndex((step) => step.parent.isConnected);
  if (kept < 0) return null;
  const sameFrame = (node: RevealNode | undefined, level: number) =>
    node !== undefined &&
    (level === 0 || node.tagName === path[level].node.tagName);
  const first = counterpart(path[kept]);
  if (!sameFrame(first, kept)) return null;
  let target = first;
  for (let level = kept - 1; level >= 0; level--) {
    const child =
      target.children[path[level].siblings.indexOf(path[level].node)];
    if (!sameFrame(child, level)) break;
    target = child;
  }
  return target;
}

export function durationMs(value: string, fallback: number) {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!match) return fallback;
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}
