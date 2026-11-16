"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { factCorrectionSchema, factInputSchema } from "@/features/coach/memory";
import { getOnboardingContext } from "@/server/onboarding/context";
import { deleteAllFacts, deleteFact, insertFact, updateFact } from "./memory";

export type FactActionResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "limit" | "missing" | "failed" };

const forgetSchema = z.strictObject({ id: z.uuid() });

function done(): FactActionResult {
  revalidatePath("/coach/memory");
  return { ok: true };
}

export async function addFact(input: unknown): Promise<FactActionResult> {
  const parsed = factInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { ok: false, reason: "failed" };
  try {
    if ((await insertFact(context, parsed.data)) === "limit")
      return { ok: false, reason: "limit" };
  } catch {
    return { ok: false, reason: "failed" };
  }
  return done();
}

export async function correctFact(input: unknown): Promise<FactActionResult> {
  const parsed = factCorrectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { ok: false, reason: "failed" };
  const { id, ...fact } = parsed.data;
  try {
    if (!(await updateFact(context, id, fact)))
      return { ok: false, reason: "missing" };
  } catch {
    return { ok: false, reason: "failed" };
  }
  return done();
}

export async function forgetFact(input: unknown): Promise<FactActionResult> {
  const parsed = forgetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { ok: false, reason: "failed" };
  try {
    if (!(await deleteFact(context, parsed.data.id)))
      return { ok: false, reason: "missing" };
  } catch {
    return { ok: false, reason: "failed" };
  }
  return done();
}

export async function clearFacts(): Promise<FactActionResult> {
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { ok: false, reason: "failed" };
  try {
    await deleteAllFacts(context);
  } catch {
    return { ok: false, reason: "failed" };
  }
  return done();
}
