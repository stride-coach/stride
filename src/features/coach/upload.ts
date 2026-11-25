import { z } from "zod";
import {
  maxAttachments,
  sentAttachmentSchema,
  type SentAttachment,
} from "./attachments";
import { fileErrors, type FileError } from "./files";

const responseSchema = z.union([
  z.object({ attachment: sentAttachmentSchema }),
  z.object({ error: z.string().max(200) }),
]);

export async function uploadCoachFile(
  file: File,
): Promise<{ attachment: SentAttachment } | { error: string }> {
  const body = new FormData();
  body.set("file", file);
  try {
    const response = await fetch("/api/coach/files", { method: "POST", body });
    const parsed = responseSchema.safeParse(await response.json());
    if (parsed.success) return parsed.data;
    return { error: fileErrors.failed satisfies FileError };
  } catch {
    return { error: fileErrors.failed };
  }
}

export function filesToAttach(files: readonly File[], attached: number) {
  return files.slice(0, Math.max(0, maxAttachments - attached));
}

export const attachmentsFullError = "Trois éléments joints au plus par message.";
