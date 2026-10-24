import type { Metadata } from "next";
import { LegalDocument } from "@/features/public/components/legal-document";
import { termsSections } from "@/features/public/legal/terms";

export const metadata: Metadata = {
  title: "Conditions d’utilisation",
  description: "Conditions générales d’utilisation du service Stride.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      current="/terms"
      title="Conditions d’utilisation"
      intro="Les règles du jeu entre toi et Stride : ce que fait le service, ce qu’il ne fait pas, et ce que chacun s’engage à respecter."
      sections={termsSections}
    />
  );
}
