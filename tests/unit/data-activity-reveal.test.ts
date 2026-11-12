import { describe, expect, it } from "vitest";
import {
  durationMs,
  replacementOf,
  revealPath,
  type RevealNode,
} from "@/features/data-activity/reveal";

type FakeNode = RevealNode & { name: string; children: FakeNode[] };

function node(tagName: string, name: string, children: FakeNode[] = []) {
  const created: FakeNode = {
    tagName,
    name,
    children,
    parentElement: null,
    isConnected: false,
  };
  for (const child of children) child.parentElement = created;
  return created;
}

function connect(root: FakeNode, connected = true) {
  root.isConnected = connected;
  for (const child of root.children) connect(child, connected);
}

function replace(parent: FakeNode, index: number, next: FakeNode) {
  const previous = parent.children[index];
  connect(previous, false);
  previous.parentElement = null;
  parent.children[index] = next;
  next.parentElement = parent;
  connect(next, parent.isConnected);
}

describe("skeleton reveal", () => {
  it("finds the content that took the skeleton's place in a kept container", () => {
    const scope = node("DIV", "skeleton");
    const main = node("MAIN", "main", [node("H1", "title"), scope]);
    const body = node("BODY", "body", [main]);
    connect(body);
    const path = revealPath(scope, body);
    replace(main, 1, node("SECTION", "content"));
    expect((replacementOf(path) as FakeNode | null)?.name).toBe("content");
  });

  it("descends through a replaced frame to the skeleton's position", () => {
    const scope = node("DIV", "skeleton");
    const frame = node("DIV", "frame", [
      node("HEADER", "header"),
      node("MAIN", "main", [scope]),
    ]);
    const panel = node("DIV", "panel", [frame]);
    connect(panel);
    const path = revealPath(scope, panel);
    const content = node("DIV", "content");
    replace(
      panel,
      0,
      node("DIV", "frame", [
        node("HEADER", "header"),
        node("MAIN", "main", [content]),
      ]),
    );
    expect(replacementOf(path)).toBe(content);
  });

  it("matches the new frame when the previous page was hidden before the skeleton", () => {
    const scope = node("DIV", "skeleton");
    const fallback = [
      node("HEADER", "fallback header"),
      node("DIV", "fallback scroll", [node("MAIN", "main", [scope])]),
    ];
    const previous = [node("HEADER", "old header"), node("DIV", "old scroll")];
    const slot = node("ASIDE", "panel slot");
    const panel = node("DIV", "panel", [...previous, ...fallback, slot]);
    connect(panel);
    const path = revealPath(scope, panel);
    const content = node("SECTION", "content");
    const next = [
      node("HEADER", "header"),
      node("DIV", "scroll", [node("MAIN", "main", [content])]),
    ];
    for (const removed of [...previous, ...fallback]) {
      connect(removed, false);
      removed.parentElement = null;
    }
    panel.children = [...next, slot];
    for (const added of next) {
      added.parentElement = panel;
      connect(added);
    }
    expect(replacementOf(path)).toBe(content);
  });

  it("stops at the deepest matching element when the structure differs", () => {
    const scope = node("DIV", "skeleton");
    const frame = node("DIV", "frame", [node("MAIN", "main", [scope])]);
    const panel = node("DIV", "panel", [frame]);
    connect(panel);
    const path = revealPath(scope, panel);
    const newFrame = node("DIV", "frame", [node("ARTICLE", "article")]);
    replace(panel, 0, newFrame);
    expect(replacementOf(path)).toBe(newFrame);
  });

  it("reveals nothing when the whole boundary left the page", () => {
    const scope = node("DIV", "skeleton");
    const panel = node("DIV", "panel", [node("MAIN", "main", [scope])]);
    connect(panel);
    const path = revealPath(scope, panel);
    connect(panel, false);
    expect(replacementOf(path)).toBeNull();
  });

  it("reveals nothing when the skeleton's place stays empty", () => {
    const scope = node("DIV", "skeleton");
    const main = node("MAIN", "main", [scope]);
    connect(main);
    const path = revealPath(scope, main);
    main.children.splice(0, 1);
    connect(scope, false);
    expect(replacementOf(path)).toBeNull();
  });
});

describe("reveal duration", () => {
  it("reads a motion token in milliseconds or seconds", () => {
    expect(durationMs("150ms", 0)).toBe(150);
    expect(durationMs(" 0.15s", 0)).toBe(150);
  });

  it("falls back when the token is missing or invalid", () => {
    expect(durationMs("", 150)).toBe(150);
    expect(durationMs("fast", 150)).toBe(150);
  });
});
