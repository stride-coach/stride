export type MoveBlock =
  "unavailable" | "duration" | "specialist" | "health" | "rules";

export const moveBlockText: Record<MoveBlock, string> = {
  unavailable: "Jour indisponible dans ton profil",
  duration: "Durée maximale du jour dépassée",
  specialist: "Contrainte de ton suivi médical",
  health: "Déconseillé vu ton état de forme",
  rules: "Ne respecte pas les règles de Stride",
};
