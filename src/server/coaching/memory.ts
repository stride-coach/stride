import "server-only";
import { cache } from "react";
import { z } from "zod";
import {
  factCategories,
  factLimit,
  type Fact,
  type FactInput,
} from "@/features/coach/memory";
import type { OnboardingContext } from "@/server/onboarding/context";

const rowSchema = z.object({
  id: z.uuid(),
  category: z.enum(factCategories),
  text: z.string(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const columns =
  "id, category, text, starts_on, ends_on, created_at, updated_at";

export const readFacts = cache(
  async (context: OnboardingContext): Promise<Fact[]> => {
    const { data, error } = await context.client
      .from("athlete_facts")
      .select(columns)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(factLimit);
    if (error) throw new Error("Unable to read the athlete facts");
    return z
      .array(rowSchema)
      .parse(data ?? [])
      .map((row) => ({
        id: row.id,
        category: row.category,
        text: row.text,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
  },
);

export async function countFacts(context: OnboardingContext) {
  const { count, error } = await context.client
    .from("athlete_facts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId);
  if (error) throw new Error("Unable to count the athlete facts");
  return count ?? 0;
}

export async function insertFact(context: OnboardingContext, input: FactInput) {
  const { error } = await context.client.from("athlete_facts").insert({
    user_id: context.userId,
    category: input.category,
    text: input.text,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
  });
  if (error) throw new Error("Unable to record the athlete fact");
}

export async function updateFact(
  context: OnboardingContext,
  id: string,
  input: FactInput,
) {
  const { data, error } = await context.client
    .from("athlete_facts")
    .update({
      category: input.category,
      text: input.text,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
    })
    .eq("user_id", context.userId)
    .eq("id", id)
    .select("id");
  if (error) throw new Error("Unable to correct the athlete fact");
  return (data ?? []).length > 0;
}

export async function deleteFact(context: OnboardingContext, id: string) {
  const { data, error } = await context.client
    .from("athlete_facts")
    .delete()
    .eq("user_id", context.userId)
    .eq("id", id)
    .select("id");
  if (error) throw new Error("Unable to forget the athlete fact");
  return (data ?? []).length > 0;
}

export async function deleteAllFacts(context: OnboardingContext) {
  const { error } = await context.client
    .from("athlete_facts")
    .delete()
    .eq("user_id", context.userId);
  if (error) throw new Error("Unable to forget the athlete facts");
}
