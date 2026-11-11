import { cn } from "@/lib/utils";
import { MonoLabel } from "@/components/stride/mono-label";
import { SourceMark, type Source } from "@/components/stride/marks";

export function ProvenanceLabel({
  source,
  variant = "inline",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  source: Source;
  variant?: "inline" | "mono";
}) {
  if (variant === "mono") {
    return (
      <MonoLabel
        size="micro"
        data-slot="provenance"
        data-source={source}
        className={className}
        {...props}
      >
        {children}
      </MonoLabel>
    );
  }
  return (
    <span
      data-slot="provenance"
      data-source={source}
      className={cn(
        "inline-flex items-center gap-1.75 text-label text-muted-foreground",
        className,
      )}
      {...props}
    >
      <SourceMark source={source} />
      <span>{children}</span>
    </span>
  );
}
