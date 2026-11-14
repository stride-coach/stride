"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { AttachmentRef } from "../attachments";
import { coachContextFromPath, coachContextHref } from "../request";

type PageContext = {
  context: AttachmentRef | null;
  setContext: (context: AttachmentRef | null) => void;
};

const CoachPageContext = createContext<PageContext | null>(null);

export function CoachContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [context, setContext] = useState<AttachmentRef | null>(null);
  return (
    <CoachPageContext value={{ context, setContext }}>
      {children}
    </CoachPageContext>
  );
}

export function CoachContextSource({ context }: { context: AttachmentRef }) {
  const setContext = useContext(CoachPageContext)?.setContext;
  const { kind, id } = context;
  useEffect(() => {
    if (!setContext) return;
    setContext({ kind, id } as AttachmentRef);
    return () => setContext(null);
  }, [setContext, kind, id]);
  return null;
}

export function useCoachRequestHref() {
  const page = useContext(CoachPageContext)?.context ?? null;
  const pathname = usePathname();
  const search = useSearchParams();
  return coachContextHref(
    page ?? coachContextFromPath(pathname, search.toString()),
  );
}
