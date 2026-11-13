"use client";

import { createContext, useContext, useState } from "react";

export type AxisRange = { fromM: number; toM: number };

export type AxisFocus = {
  cursorM: number;
  setCursorM: (distanceM: number) => void;
  highlight: AxisRange | null;
  setHighlight: (range: AxisRange | null) => void;
};

const AxisFocusContext = createContext<AxisFocus | null>(null);

function useFocusState(): AxisFocus {
  const [cursorM, setCursorM] = useState(0);
  const [highlight, setHighlight] = useState<AxisRange | null>(null);
  return { cursorM, setCursorM, highlight, setHighlight };
}

export function AxisFocusProvider({ children }: { children: React.ReactNode }) {
  const focus = useFocusState();
  return <AxisFocusContext value={focus}>{children}</AxisFocusContext>;
}

export function useAxisFocus(): AxisFocus {
  const shared = useContext(AxisFocusContext);
  const local = useFocusState();
  return shared ?? local;
}
