import { refusalText, splitFrames, type StreamEvent } from "./stream";

export async function refusalFromResponse(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  return refusalText(
    data && typeof data === "object" && "code" in data ? data.code : null,
  );
}

export async function readTurnEvents(
  response: Response,
  onEvent: (event: StreamEvent) => void,
) {
  const reader = response.body
    ?.pipeThrough(new TextDecoderStream())
    .getReader();
  if (!reader) return;
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    const { events, rest } = splitFrames(buffer + value);
    buffer = rest;
    events.forEach(onEvent);
  }
}

export async function interruptTurn(threadId: string) {
  const response = await fetch("/api/coach/turns/interrupt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId }),
  }).catch(() => null);
  return response !== null && (response.ok || response.status === 409);
}
