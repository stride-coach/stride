import { Badge } from "@/components/ui/badge";
import type { Zone } from "@/components/stride/session-blocks";
import { zoneFills } from "@/components/stride/session-shape";
import { cn } from "@/lib/utils";

export function Chip({
  intensity,
  proposal = false,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { intensity?: Zone; proposal?: boolean }) {
  return (
    <Badge
      data-slot="chip"
      variant={proposal ? "accent" : "outline"}
      className={className}
      {...props}
    >
      {intensity && (
        <span
          aria-hidden="true"
          className={cn("size-1.75 rounded-mark", zoneFills[intensity])}
        />
      )}
      {children}
    </Badge>
  );
}
