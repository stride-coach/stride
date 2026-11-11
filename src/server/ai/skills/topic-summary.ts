import "server-only";
import { z } from "zod";
import { staffMessages } from "@/features/coach/conversations";
import type { ThreadItem } from "@/features/coach/items";
import { markdownPlainText } from "@/features/coach/markdown";
import { staff } from "@/features/coach/staff";
import { aiModel, completeStructured, type AiCompletion } from "../provider";

const system = [
  "Tu es le Coach de Stride, un staff de course à pied.",
  "L’athlète clôt un sujet de discussion. Résume ce qu’on en retient pour qu’il le relise plus tard dans son fil principal.",
  "Règles : deux ou trois phrases, 320 caractères maximum, tutoiement, ton sobre.",
  "Dis ce qui a été constaté et ce qui a été décidé ou conseillé. N’invente rien qui ne soit pas dans l’échange, aucun diagnostic, aucune promesse.",
].join("\n");

const responseSchema = z.object({ summary: z.string() });

type Complete = (request: {
  system: string;
  user: string;
  maxTokens: number;
  schema: typeof responseSchema;
}) => Promise<AiCompletion<z.infer<typeof responseSchema>>>;

const transcriptLimit = 24_000;

export function topicTranscript(items: readonly ThreadItem[]) {
  const shown = staffMessages(items);
  const lines = items.flatMap((item) => {
    switch (item.kind) {
      case "athlete":
      case "answer":
        return [`Athlète : ${item.text}`];
      case "coach":
        return item.text.trim()
          ? [`${staff.coach.name} : ${markdownPlainText(item.text)}`]
          : [];
      case "staff_message":
        return [`${staff[item.agent].name} : ${markdownPlainText(item.text)}`];
      case "consult_reply":
        return shown.has(item)
          ? [`${staff[item.agent].name} : ${markdownPlainText(item.text)}`]
          : [];
      case "question":
        return [`${staff[item.askedFor].name} demande : ${item.question}`];
      case "proposal":
        return [`Proposition : ${item.title}`];
      default:
        return [];
    }
  });
  const text = lines.join("\n");
  return text.length > transcriptLimit ? text.slice(-transcriptLimit) : text;
}

export async function summarizeTopic({
  title,
  items,
  complete = completeStructured,
}: {
  title: string;
  items: readonly ThreadItem[];
  complete?: Complete;
}): Promise<string | null> {
  const transcript = topicTranscript(items);
  if (!transcript) return null;
  const started = Date.now();
  const result = await complete({
    system,
    user: `Sujet : ${title}\n\n${transcript}`,
    maxTokens: 400,
    schema: responseSchema,
  });
  const summary = result.ok ? result.output.summary.trim() : "";
  const accepted = summary.length > 0 && summary.length <= 600;
  console.info(
    JSON.stringify({
      event: "ai.skill",
      skill: "topic-summary",
      model: aiModel,
      outcome: result.ok ? (accepted ? "completed" : "rejected") : "failed",
      status: result.ok ? null : result.status,
      promptTokens: result.ok ? result.usage.promptTokens : null,
      completionTokens: result.ok ? result.usage.completionTokens : null,
      durationMs: Date.now() - started,
    }),
  );
  return accepted ? summary : null;
}
