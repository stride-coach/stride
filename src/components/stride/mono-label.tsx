import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const monoLabelVariants = cva("font-medium tabular-nums", {
  variants: {
    size: {
      nano: "text-label",
      micro: "text-label",
      label: "text-label",
    },
    tone: {
      muted: "text-muted-foreground",
      secondary: "text-secondary-foreground",
      foreground: "text-foreground",
      accent: "text-primary",
      warning: "text-warning",
    },
  },
  defaultVariants: {
    size: "label",
    tone: "muted",
  },
});

export function MonoLabel({
  className,
  size,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof monoLabelVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="mono-label"
      className={cn(monoLabelVariants({ size, tone }), className)}
      {...props}
    />
  );
}
