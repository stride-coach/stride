export const composerMaxLines = 6;

export type SendButtonState = "off" | "on" | "stop";

export function sendButtonState({
  text,
  working,
}: {
  text: string;
  working: boolean;
}): SendButtonState {
  if (working) return "stop";
  return text.trim() ? "on" : "off";
}

export type ComposerLayout = { stacked: boolean; stackedAt: number | null };

export const inlineLayout: ComposerLayout = { stacked: false, stackedAt: null };

export function nextComposerLayout(
  layout: ComposerLayout,
  { text, lines }: { text: string; lines: number },
): ComposerLayout {
  const breaks = text.includes("\n");
  if (!text) return inlineLayout;
  if (!layout.stacked)
    return breaks || lines > 1
      ? { stacked: true, stackedAt: text.length }
      : layout;
  if (!breaks && layout.stackedAt !== null && text.length < layout.stackedAt)
    return inlineLayout;
  return layout;
}
