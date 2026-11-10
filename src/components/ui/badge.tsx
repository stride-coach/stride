import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border px-1.75 py-0.75 tabular-nums text-label leading-none whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-2.5",
  {
    variants: {
      variant: {
        outline: "border-control-border text-secondary-foreground",
        accent: "border-primary/40 text-primary",
        success: "border-border text-primary",
        warning: "border-warning/30 text-warning",
        danger: "border-border text-destructive",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

function Badge({
  className,
  variant = "outline",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
