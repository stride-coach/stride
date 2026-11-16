export const coachTabs = [
  { href: "/coach", label: "Conversation", short: "Conversation" },
  { href: "/coach/decisions", label: "Décisions", short: "Décisions" },
  {
    href: "/coach/memory",
    label: "Ce que je sais de toi",
    short: "Sur toi",
  },
  { href: "/coach/team", label: "Le staff", short: "Staff" },
] as const;

export type CoachTabHref = (typeof coachTabs)[number]["href"];

export function currentCoachTab(pathname: string): CoachTabHref {
  const tab = coachTabs.find(
    (item) =>
      item.href !== "/coach" &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return tab?.href ?? "/coach";
}
