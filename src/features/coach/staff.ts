export const staffAgents = [
  "coach",
  "medical",
  "director",
  "strategist",
  "nutritionist",
] as const;

export type StaffAgent = (typeof staffAgents)[number];

type RoleWords = {
  name: string;
  subject: string;
  object: string;
  of: string;
  to: string;
};

const roleWords: Record<StaffAgent, RoleWords> = {
  coach: {
    name: "Coach",
    subject: "Le Coach",
    object: "le Coach",
    of: "du Coach",
    to: "au Coach",
  },
  medical: {
    name: "Santé",
    subject: "Santé",
    object: "Santé",
    of: "de Santé",
    to: "à Santé",
  },
  director: {
    name: "Directeur sportif",
    subject: "Le Directeur sportif",
    object: "le Directeur sportif",
    of: "du Directeur sportif",
    to: "au Directeur sportif",
  },
  strategist: {
    name: "Stratège de course",
    subject: "Le Stratège de course",
    object: "le Stratège de course",
    of: "du Stratège de course",
    to: "au Stratège de course",
  },
  nutritionist: {
    name: "Nutrition",
    subject: "Nutrition",
    object: "Nutrition",
    of: "de Nutrition",
    to: "à Nutrition",
  },
};

export type StaffMember = RoleWords & { agent: StaffAgent };

export type Staff = Record<StaffAgent, StaffMember>;

export function staffMember(agent: StaffAgent): StaffMember {
  return { agent, ...roleWords[agent] };
}

export const staff: Staff = {
  coach: staffMember("coach"),
  medical: staffMember("medical"),
  director: staffMember("director"),
  strategist: staffMember("strategist"),
  nutritionist: staffMember("nutritionist"),
};

const managedNames: Record<string, StaffAgent> = {
  "Stride Coach": "coach",
  "Stride Medical": "medical",
  "Stride Sports Director": "director",
  "Stride Course Strategist": "strategist",
  "Stride Nutritionist": "nutritionist",
};

export const specialistAgents = [
  "medical",
  "director",
  "strategist",
  "nutritionist",
] as const satisfies readonly StaffAgent[];

export type SpecialistAgent = (typeof specialistAgents)[number];

export const managedNameOf: Record<StaffAgent, string> = {
  coach: "Stride Coach",
  medical: "Stride Medical",
  director: "Stride Sports Director",
  strategist: "Stride Course Strategist",
  nutritionist: "Stride Nutritionist",
};

export function agentOfManagedName(name: string | null | undefined) {
  return managedNames[name ?? ""] ?? null;
}

export function staffJoin(staff: Staff, agents: readonly StaffAgent[]) {
  const names = agents.map((agent) => staff[agent].object);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}

export function groupLine(staff: Staff, athlete: string | null) {
  const names = staffAgents.map((agent) => staff[agent].name).join(", ");
  const roles = `Rôles dans ce groupe, sans prénom : ${names}.`;
  return athlete ? `${roles} Athlète : ${athlete}.` : roles;
}
