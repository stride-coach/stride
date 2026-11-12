export const settingsSections = [
  { slug: "", label: "Vue d’ensemble", group: "You" },
  { slug: "profile", label: "Profil et zones", group: "You" },
  { slug: "training", label: "Entraînement et staff", group: "You" },
  { slug: "notifications", label: "Notifications", group: "You" },
  { slug: "appearance", label: "Apparence et raccourcis", group: "You" },
  { slug: "connections", label: "Connexions", group: "Data" },
  { slug: "privacy", label: "Données et confidentialité", group: "Data" },
] as const;

export type SettingsSection = (typeof settingsSections)[number]["slug"];

export function settingsHref(slug: SettingsSection) {
  return slug ? `/settings/${slug}` : "/settings";
}
