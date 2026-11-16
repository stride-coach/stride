import { Chip } from "@/components/stride/chip";
import { Status } from "@/components/stride/status";
import type { DecisionResponse } from "@/features/coach/decisions";
import { cn } from "@/lib/utils";

export function DecisionResponseState({
  response,
  className,
}: {
  response: DecisionResponse;
  className?: string;
}) {
  if (response.kind === "pending")
    return (
      <Chip proposal className={className}>
        {response.label}
      </Chip>
    );
  return (
    <Status
      level={response.kind === "rejected" ? "watch" : "ok"}
      className={cn(
        response.kind === "unanswered" && "text-muted-foreground",
        className,
      )}
    >
      {response.label}
    </Status>
  );
}
