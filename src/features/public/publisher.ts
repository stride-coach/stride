export const publisher = {
  name: "Jules Thibault EI",
  legalForm: "Entreprise individuelle, micro-entreprise",
  siret: "844 478 891 00030",
  activity: "62.01Z · Programmation informatique",
  vat: "TVA non applicable, art. 293 B du CGI",
  address: "[adresse de domiciliation]",
  director: "Jules Thibault",
  email: "julestblt.dev@pm.me",
  appHost: "[nom, adresse et téléphone de l’hébergeur]",
  appHostCountry: "[pays de l’hébergeur]",
} as const;

export const legalUpdatedOn = "24/10/2026";

export const legalPages = [
  { href: "/privacy", label: "Confidentialité", short: "Confidentialité" },
  { href: "/terms", label: "Conditions d’utilisation", short: "Conditions" },
  { href: "/legal", label: "Mentions légales", short: "Mentions légales" },
] as const;

export type LegalHref = (typeof legalPages)[number]["href"];
