"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyProgramButton({ text }: { text: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Programme copié", {
        id: "copy-program",
        description:
          "Colle-le dans l’IA de ton choix pour lui demander un second avis.",
      });
    } catch {
      toast.error("Le programme n’a pas pu être copié. Réessaie.", {
        id: "copy-program",
      });
    }
  }
  return (
    <Button type="button" variant="ghost" size="md" onClick={copy}>
      <CopyIcon aria-hidden="true" />
      <span>
        Copier<span className="max-sm:sr-only"> le programme</span>
      </span>
    </Button>
  );
}
