import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.25 overflow-hidden rounded-sm border px-1.75 text-label leading-none whitespace-nowrap tabular-nums [&>svg]:pointer-events-none [&>svg]:size-2.5",
  {
    variants: {
      variant: {
        outline: "border-control-border text-secondary-foreground",
        accent: "border-transparent bg-accent font-medium text-primary",
        success: "border-control-border font-medium text-primary",
        warning: "border-control-border font-medium text-warning",
        danger: "border-control-border font-medium text-destructive",
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
