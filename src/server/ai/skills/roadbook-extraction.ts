import "server-only";
import { z } from "zod";
import {
  roadbookCandidateSchema,
  shapeCandidates,
  type RoadbookCandidate,
} from "@/features/races/roadbook";
import { aiModel, completeStructured } from "../provider";

const maximumCharacters = 24_000;

const system = [
  "Tu extrais les points de passage d’un roadbook de course à pied.",
  "Tu ne gardes que les ravitaillements, points d’eau, bases de vie, sommets, zones de vigilance et consignes de parcours qui ont un kilomètre écrit dans le texte.",
  "N’invente aucun point, aucun kilomètre et aucune heure : chaque valeur doit figurer dans le texte.",
  "kind vaut aid, water, base, summit, caution ou instruction. cutoff est l’heure limite de passage au format HH:MM, ou null.",
  "services est une liste parmi water, sweet, salty, hot, toilets, assistance, seulement si le texte les cite.",
  "Ignore le départ et l’arrivée.",
].join("\n");

const outputSchema = z.object({
  points: z.array(
    z.object({
      name: z.string(),
      km: z.number(),
      kind: roadbookCandidateSchema.shape.kind,
      cutoff: z.string().nullable(),
      services: z.array(roadbookCandidateSchema.shape.services.element),
    }),
  ),
});

export async function extractRoadbookWithAi(
  text: string,
): Promise<RoadbookCandidate[] | null> {
  const started = Date.now();
  const result = await completeStructured({
    system,
    user: text.slice(0, maximumCharacters),
    maxTokens: 2500,
    schema: outputSchema,
  });
  const candidates = result.ok ? shapeCandidates(result.output) : null;
  console.info(
    JSON.stringify({
      event: "ai.skill",
      skill: "roadbook-extraction",
      model: aiModel,
      outcome: result.ok ? "accepted" : "failed",
      status: result.ok ? null : result.status,
      points: candidates?.length ?? 0,
      promptTokens: result.ok ? result.usage.promptTokens : null,
      completionTokens: result.ok ? result.usage.completionTokens : null,
      durationMs: Date.now() - started,
    }),
  );
  return candidates;
}
