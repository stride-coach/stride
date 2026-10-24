import Link from "next/link";
import {
  LegalFacts,
  type LegalSection,
} from "@/features/public/components/legal-document";
import { publisher } from "@/features/public/publisher";

export const noticeSections: readonly LegalSection[] = [
  {
    id: "editeur",
    title: "Éditeur",
    content: (
      <LegalFacts
        facts={[
          ["Raison sociale", publisher.name],
          ["Forme juridique", publisher.legalForm],
          ["SIRET", publisher.siret],
          ["Code NAF", publisher.activity],
          ["TVA", publisher.vat],
          ["Adresse", publisher.address],
          [
            "Contact",
            <a key="email" href={`mailto:${publisher.email}`}>
              {publisher.email}
            </a>,
          ],
        ]}
      />
    ),
  },
  {
    id: "publication",
    title: "Directeur de la publication",
    toc: "Publication",
    content: <p>{publisher.director}.</p>,
  },
  {
    id: "hebergement",
    title: "Hébergement",
    content: (
      <LegalFacts
        facts={[
          ["Application", publisher.appHost],
          [
            "Base de données",
            "Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513 · serveurs Amazon Web Services à Paris (eu-west-3)",
          ],
        ]}
      />
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    content: (
      <p>
        Le nom Stride, son interface, ses textes et ses visuels sont protégés.
        Toute reproduction sans autorisation écrite est interdite. Garmin est
        une marque de Garmin Ltd. ou de ses filiales, citée uniquement pour
        décrire la compatibilité du service.
      </p>
    ),
  },
  {
    id: "donnees",
    title: "Données personnelles",
    content: (
      <p>
        Le traitement de tes données est décrit dans la{" "}
        <Link href="/privacy">politique de confidentialité</Link>.
      </p>
    ),
  },
];
