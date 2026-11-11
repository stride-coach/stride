"use client";

import { createContext, useContext } from "react";
import type { ShellAthlete, ShellGoal, ShellSeason } from "../shell";

export type ShellIdentity = {
  athlete: ShellAthlete;
  goal: ShellGoal | null;
  seasons: Promise<ShellSeason[]>;
  modelDetail: string;
};

const ShellIdentityContext = createContext<ShellIdentity | null>(null);

export function ShellIdentityProvider({
  value,
  children,
}: {
  value: ShellIdentity;
  children: React.ReactNode;
}) {
  return (
    <ShellIdentityContext.Provider value={value}>
      {children}
    </ShellIdentityContext.Provider>
  );
}

export function useShellIdentity() {
  return useContext(ShellIdentityContext);
}
