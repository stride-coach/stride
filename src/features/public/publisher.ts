export const publisher = {
  status: "Projet personnel, gratuit et non commercial",
  github: "https://github.com/Julestblt",
  githubLabel: "github.com/Julestblt",
  email: "julestblt.dev@pm.me",
  appHost: "Serveur personnel de l’éditeur",
  appHostCountry: "France",
} as const;

export const legalUpdatedOn = "24/10/2026";
export const privacyPolicyVersion = "2026-10-24";

export const legalPages = [
  { href: "/privacy", label: "Confidentialité", short: "Confidentialité" },
  { href: "/terms", label: "Conditions d’utilisation", short: "Conditions" },
  { href: "/legal", label: "Mentions légales", short: "Mentions légales" },
] as const;

export type LegalHref = (typeof legalPages)[number]["href"];
