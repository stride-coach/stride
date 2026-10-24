import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const aiModel = "claude-haiku-5-5";

export type AiUsage = { promptTokens: number; completionTokens: number };
export type AiCompletion<Output> =
  | { ok: true; output: Output; usage: AiUsage }
  | { ok: false; status: number | null };

let client: Anthropic | null = null;

export function anthropic() {
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}

export async function completeStructured<Schema extends z.ZodType>({
  system,
  user,
  maxTokens,
  schema,
  send = anthropic,
}: {
  system: string;
  user: string;
  maxTokens: number;
  schema: Schema;
  send?: () => Pick<Anthropic, "messages">;
}): Promise<AiCompletion<z.infer<Schema>>> {
  try {
    const response = await send().messages.parse({
      model: aiModel,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low", format: zodOutputFormat(schema) },
    });
    if (response.stop_reason === "refusal" || response.parsed_output == null)
      return { ok: false, status: null };
    return {
      ok: true,
      output: response.parsed_output,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status:
        error instanceof Anthropic.APIError ? (error.status ?? null) : null,
    };
  }
}
