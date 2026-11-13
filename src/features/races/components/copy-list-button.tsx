"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyListButton({ text }: { text: string }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          navigator.clipboard
            .writeText(text)
            .then(() => setCopied("done"))
            .catch(() => setCopied("failed"))
        }
      >
        Copier la liste
      </Button>
      <span role="status" className="text-label text-muted-foreground">
        {copied === "done"
          ? "Liste copiée"
          : copied === "failed"
            ? "Copie impossible ici"
            : ""}
      </span>
    </div>
  );
}
