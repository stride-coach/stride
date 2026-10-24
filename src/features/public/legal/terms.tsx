import Link from "next/link";
import type { LegalSection } from "@/features/public/components/legal-document";
import { publisher } from "@/features/public/publisher";

const contact = <a href={`mailto:${publisher.email}`}>{publisher.email}</a>;

export const termsSections: readonly LegalSection[] = [
  {
    id: "objet",
    title: "Objet",
    content: (
      <p>
        Ces conditions encadrent l’utilisation de Stride, un service web
        d’accompagnement à l’entraînement en course à pied sur route et en
        trail, édité par {publisher.name}. Créer un compte vaut acceptation de
        ces conditions et de la{" "}
        <Link href="/privacy">politique de confidentialité</Link>.
      </p>
    ),
  },
  {
    id: "service",
    title: "Le service",
    content: (
      <>
        <p>
          Stride construit et adapte un plan d’entraînement, analyse tes
          séances, suit ta récupération, prépare tes courses et peut envoyer tes
          séances sur ta montre. Le service évolue : des fonctionnalités peuvent
          être ajoutées, modifiées ou retirées.
        </p>
        <p>
          L’accès est actuellement gratuit. Si des fonctionnalités payantes sont
          proposées, leur prix et leurs conditions te seront présentés avant
          toute souscription, et rien ne te sera facturé sans ton accord.
        </p>
      </>
    ),
  },
  {
    id: "compte",
    title: "Ton compte",
    content: (
      <ul>
        <li>Tu dois avoir au moins 18 ans pour créer un compte.</li>
        <li>
          Tu fournis des informations exactes et tu les tiens à jour, en
          particulier ton profil et tes antécédents de blessure.
        </li>
        <li>
          Ton compte est personnel. Tu gardes ton mot de passe confidentiel et
          tu nous préviens si tu penses qu’il a été compromis.
        </li>
      </ul>
    ),
  },
  {
    id: "sante",
    title: "Santé et sécurité",
    content: (
      <>
        <p>
          Stride est un outil d’entraînement,{" "}
          <strong>pas un dispositif médical</strong>. Il ne pose aucun
          diagnostic et ne remplace pas l’avis d’un médecin ou d’un
          professionnel de santé.
        </p>
        <ul>
          <li>
            Consulte un médecin avant de reprendre ou d’intensifier
            l’entraînement, en particulier en cas d’antécédents médicaux.
          </li>
          <li>
            Arrête l’effort et consulte en cas de douleur thoracique, de
            malaise, d’essoufflement inhabituel ou de douleur qui persiste.
          </li>
          <li>
            Tu restes seul juge de ce que tu fais : chaque séance est réalisée
            sous ta responsabilité, en tenant compte de ton état, du terrain et
            de la météo.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "ia",
    title: "Contenus générés par IA",
    content: (
      <p>
        Les messages, analyses et propositions du staff sont générés par un
        modèle d’IA à partir de tes données. Ils peuvent être incomplets ou
        inexacts. Les changements importants de ton plan attendent ton accord :
        vérifie-les et garde un regard critique, notamment sur tout ce qui
        touche à ta santé.
      </p>
    ),
  },
  {
    id: "tiers",
    title: "Services tiers",
    content: (
      <p>
        La connexion à Garmin se fait à ton initiative et reste soumise aux
        conditions de Garmin. Stride dépend de la disponibilité de ces services
        et ne peut garantir qu’ils fournissent toutes les données attendues.
        Garmin est une marque de Garmin Ltd. ou de ses filiales ; Stride n’est
        ni édité ni approuvé par Garmin.
      </p>
    ),
  },
  {
    id: "usage",
    title: "Utilisation acceptable",
    content: (
      <>
        <p>En utilisant Stride, tu t’engages à ne pas :</p>
        <ul>
          <li>accéder au compte d’une autre personne ;</li>
          <li>
            contourner les mesures de sécurité, extraire massivement des données
            ou perturber le fonctionnement du service ;
          </li>
          <li>
            utiliser le staff pour produire des contenus illicites, haineux ou
            sans rapport avec ton entraînement de manière abusive.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "propriete",
    title: "Propriété",
    content: (
      <p>
        Stride, son interface, ses textes et son code appartiennent à{" "}
        {publisher.name}. Tes données restent les tiennes : tu autorises
        seulement Stride à les traiter pour te fournir le service.
      </p>
    ),
  },
  {
    id: "responsabilite",
    title: "Disponibilité et responsabilité",
    content: (
      <p>
        Stride fait son possible pour que le service soit disponible et exact,
        sans pouvoir le garantir en permanence. Dans les limites permises par la
        loi, {publisher.name} n’est pas responsable des dommages indirects ni
        des conséquences des décisions d’entraînement que tu prends. Rien dans
        ces conditions ne limite les droits que tu tiens de la loi en tant que
        consommateur.
      </p>
    ),
  },
  {
    id: "fin",
    title: "Résiliation",
    content: (
      <p>
        Tu peux arrêter d’utiliser Stride à tout moment et demander la
        suppression de ton compte à {contact}. Stride peut suspendre un compte
        qui enfreint ces conditions, après t’avoir prévenu sauf urgence.
      </p>
    ),
  },
  {
    id: "modifications",
    title: "Modifications",
    content: (
      <p>
        En cas de changement important de ces conditions, tu seras prévenu par
        e-mail ou dans l’application avant son entrée en vigueur. Si tu ne les
        acceptes pas, tu peux fermer ton compte.
      </p>
    ),
  },
  {
    id: "droit",
    title: "Droit applicable",
    content: (
      <p>
        Ces conditions sont soumises au droit français. En cas de désaccord,
        écris d’abord à {contact} pour chercher une solution amiable. À défaut,
        les tribunaux compétents sont ceux désignés par la loi, dont celui de
        ton domicile.
      </p>
    ),
  },
];
