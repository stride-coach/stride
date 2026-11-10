"use client";
import Link from "next/link";
import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function HealthConsentField({
  checked,
  onCheckedChange,
  children,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-surface-panel p-3.5 lg:gap-2.5 lg:px-4.5 lg:py-4",
        checked ? "border-primary" : "border-border-strong",
        className,
      )}
    >
      <div className="grid grid-cols-[1.25rem_1fr] items-start gap-2.5 lg:gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-describedby={`${id}-help`}
          className="mt-0.5 size-5 lg:size-4.5"
        />
        <label htmlFor={id} className="text-sm leading-normal lg:text-body">
          J’accepte que Stride traite mes données de santé — sommeil, VFC,
          fréquence cardiaque et douleurs que je signale — uniquement pour
          adapter mon entraînement.
        </label>
      </div>
      <p
        id={`${id}-help`}
        className="ml-8 text-xs text-muted-foreground lg:text-meta"
      >
        {children}{" "}
        <Link href="/privacy" className="text-primary hover:text-foreground">
          Lire la politique de confidentialité
        </Link>
      </p>
    </div>
  );
}
