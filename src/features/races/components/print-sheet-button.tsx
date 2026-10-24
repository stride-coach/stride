"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintSheetButton({
  label = "Imprimer la fiche",
  icon = true,
  size = "sm",
  className,
}: {
  label?: string;
  icon?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn("print:hidden", className)}
      onClick={() => window.print()}
    >
      {icon && <PrinterIcon data-icon="inline-start" />}
      {label}
    </Button>
  );
}
