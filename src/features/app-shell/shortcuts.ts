export type ShortcutEntry = {
  label: string;
  keys: { combo: readonly string[] } | { sequence: readonly string[] };
};

export const shortcutGroups: readonly {
  title: string;
  entries: readonly ShortcutEntry[];
}[] = [
  {
    title: "Navigation",
    entries: [
      { label: "Ouvrir les activités", keys: { sequence: ["G", "A"] } },
      { label: "Ouvrir les réglages", keys: { sequence: ["G", "R"] } },
      { label: "Réduire la barre latérale", keys: { combo: ["⌘", "B"] } },
      { label: "Réglages", keys: { combo: ["⌘", ","] } },
      { label: "Raccourcis clavier", keys: { combo: ["?"] } },
    ],
  },
];
