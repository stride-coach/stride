import { cn } from "@/lib/utils";
import { splitMatches } from "../search";

export type Highlight = { query: string; current: boolean } | null;

export function Highlighted({
  text,
  highlight,
}: {
  text: string;
  highlight?: Highlight;
}) {
  if (!highlight) return text;
  return splitMatches(text, highlight.query).map((part, index) =>
    part.match ? (
      <mark
        key={index}
        className={cn(
          "rounded-mark px-0.5",
          highlight.current
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-primary",
        )}
      >
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
