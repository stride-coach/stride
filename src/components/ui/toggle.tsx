"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Toggle as TogglePrimitive } from "radix-ui";

const toggleVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap transition-[background-color,border-color,color] duration-150 ease-stride disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        choice:
          "min-h-control-auto rounded-md border border-control-border bg-card px-2.5 text-body text-secondary-foreground hover:border-muted-foreground hover:text-foreground data-[state=on]:border-muted-foreground data-[state=on]:bg-muted data-[state=on]:font-semibold data-[state=on]:text-foreground",
        day: "size-control-touch rounded-full border border-control-border bg-card text-body font-medium text-muted-foreground hover:border-muted-foreground hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:font-semibold data-[state=on]:text-primary",
        segment:
          "min-h-6 rounded-md px-2.5 text-body font-medium text-muted-foreground hover:text-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground",
      },
    },
    defaultVariants: {
      variant: "choice",
    },
  },
);

function Toggle({
  className,
  variant = "choice",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
