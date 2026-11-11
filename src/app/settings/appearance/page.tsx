import type { Metadata } from "next";
import { shortcutGroups } from "@/features/app-shell/shortcuts";
import { SettingsHeading } from "@/features/settings/components/settings-shell";
import { ThemeChoice } from "@/features/theme/components/theme-choice";
import { requireAthleteAccount } from "@/server/app/session";

export const metadata: Metadata = {
  title: "Apparence et raccourcis · Réglages",
};

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded-sm border border-control-border bg-card px-1 text-label text-secondary-foreground tabular-nums">
      {children}
    </kbd>
  );
}

export default async function AppearanceSettingsPage() {
  await requireAthleteAccount();
  return (
    <>
      <SettingsHeading title="Apparence et raccourcis" />
      <section aria-labelledby="appearance-display" className="mb-8">
        <h2
          id="appearance-display"
          className="border-b border-border pb-2.5 text-body-lg font-semibold"
        >
          Affichage
        </h2>
        <ThemeChoice />
      </section>
      <section aria-labelledby="appearance-shortcuts">
        <div className="flex flex-col gap-0.5 border-b border-border pb-2.5">
          <h2 id="appearance-shortcuts" className="text-body-lg font-semibold">
            Raccourcis clavier
          </h2>
          <p className="text-secondary-foreground">
            Appuie sur ? n’importe où pour ouvrir cette aide. Sur Windows et
            Linux, ⌘ devient Ctrl.
          </p>
        </div>
        <div className="grid gap-x-8 md:grid-cols-2">
          {shortcutGroups.map((group) => (
            <section
              key={group.title}
              aria-label={group.title}
              className="flex flex-col pt-4"
            >
              <h3 className="pb-1 text-label text-muted-foreground">
                {group.title}
              </h3>
              <ul>
                {group.entries.map((entry) => (
                  <li
                    key={entry.label}
                    className="flex min-h-row items-center justify-between gap-3 border-b border-border"
                  >
                    <span>{entry.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {"sequence" in entry.keys ? (
                        <>
                          <Key>{entry.keys.sequence[0]}</Key>
                          <span className="text-label text-muted-foreground">
                            puis
                          </span>
                          <Key>{entry.keys.sequence[1]}</Key>
                        </>
                      ) : (
                        entry.keys.mac.map((key) => <Key key={key}>{key}</Key>)
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
