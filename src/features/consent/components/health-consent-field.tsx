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
        "flex flex-col gap-2 rounded-lg border bg-card px-4 py-3.5",
        checked ? "border-primary" : "border-control-border",
        className,
      )}
    >
      <div className="grid grid-cols-[1.25rem_1fr] items-start gap-2.5">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-describedby={`${id}-help`}
          className="mt-0.5 size-5 lg:size-4"
        />
        <label htmlFor={id} className="text-body">
          J’accepte que Stride traite mes données de santé — sommeil, VFC,
          fréquence cardiaque et douleurs que je signale — uniquement pour
          adapter mon entraînement.
        </label>
      </div>
      <p id={`${id}-help`} className="ml-7.5 text-label text-muted-foreground">
        {children}{" "}
        <Link href="/privacy" className="text-primary hover:text-foreground">
          Lire la politique de confidentialité
        </Link>
      </p>
    </div>
  );
}
