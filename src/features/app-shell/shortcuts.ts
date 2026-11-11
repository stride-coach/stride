export type ShortcutKeys = { mac: readonly string[]; other: readonly string[] };

export type ShortcutEntry = {
  label: string;
  keys: ShortcutKeys | { sequence: readonly string[] };
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
      {
        label: "Réduire la barre latérale",
        keys: { mac: ["⌘", "B"], other: ["Ctrl", "B"] },
      },
      { label: "Réglages", keys: { mac: ["⌘", ","], other: ["Ctrl", ","] } },
      { label: "Raccourcis clavier", keys: { mac: ["?"], other: ["?"] } },
    ],
  },
  {
    title: "Commandes",
    entries: [
      {
        label: "Rechercher dans cette aide",
        keys: { mac: ["/"], other: ["/"] },
      },
    ],
  },
];
