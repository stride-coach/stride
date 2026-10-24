import type { Metadata } from "next";
import { LegalDocument } from "@/features/public/components/legal-document";
import { noticeSections } from "@/features/public/legal/notice";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, directeur de la publication et hébergeurs de Stride.",
};

export default function LegalNoticePage() {
  return (
    <LegalDocument
      current="/legal"
      title="Mentions légales"
      sections={noticeSections}
    />
  );
}
