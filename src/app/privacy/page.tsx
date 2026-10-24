import type { Metadata } from "next";
import { LegalDocument } from "@/features/public/components/legal-document";
import { privacySections } from "@/features/public/legal/privacy";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Données collectées par Stride, finalités, prestataires, conservation et droits des athlètes.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      current="/privacy"
      title="Politique de confidentialité"
      intro="Ce que Stride collecte, pourquoi, avec qui c’est partagé et comment exercer tes droits. Écrit pour être lu en cinq minutes."
      sections={privacySections}
    />
  );
}
