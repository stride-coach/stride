import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { splitMentions } from "../thread";
import { Highlighted, type Highlight } from "./highlighted";
import {
  parseMarkdown,
  type MarkdownList,
  type MarkdownSpan,
} from "../markdown";

function Spans({
  spans,
  highlight,
}: {
  spans: readonly MarkdownSpan[];
  highlight?: Highlight;
}) {
  return spans.map((span, index) => {
    let node: React.ReactNode = splitMentions(span.text).map(
      (part, partIndex) =>
        partIndex % 2 === 1 ? (
          <span key={partIndex} className="font-medium text-primary">
            <Highlighted text={part} highlight={highlight} />
          </span>
        ) : (
          <Fragment key={partIndex}>
            <Highlighted text={part} highlight={highlight} />
          </Fragment>
        ),
    );
    if (span.italic) node = <em>{node}</em>;
    if (span.bold) node = <strong className="font-semibold">{node}</strong>;
    return <Fragment key={index}>{node}</Fragment>;
  });
}

function List({
  list,
  nested = false,
  highlight,
}: {
  list: MarkdownList;
  nested?: boolean;
  highlight?: Highlight;
}) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "flex flex-col gap-1 pl-5",
        list.ordered ? "list-decimal" : "list-disc",
        nested && "mt-1",
      )}
    >
      {list.items.map((item, index) => (
        <li key={index} className="pl-0.5 marker:text-muted-foreground">
          <Spans spans={item.spans} highlight={highlight} />
          {item.children && (
            <List list={item.children} nested highlight={highlight} />
          )}
        </li>
      ))}
    </Tag>
  );
}

export function Markdown({
  text,
  className,
  highlight,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  text: string;
  highlight?: Highlight;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} {...props}>
      {parseMarkdown(text).map((block, index) => {
        if (block.type === "heading")
          return (
            <p key={index} className="font-semibold">
              <Spans spans={block.spans} highlight={highlight} />
            </p>
          );
        if (block.type === "list")
          return <List key={index} list={block} highlight={highlight} />;
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                <Spans spans={line} highlight={highlight} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
