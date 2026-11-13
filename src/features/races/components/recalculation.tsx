"use client";

import { createContext, useContext, useEffect, useId } from "react";

type Report = (id: string, pending: boolean) => void;

export const RecalculationReport = createContext<Report | null>(null);

export function useReportRecalculation(pending: boolean) {
  const report = useContext(RecalculationReport);
  const id = useId();
  useEffect(() => {
    report?.(id, pending);
    return () => report?.(id, false);
  }, [report, id, pending]);
}
