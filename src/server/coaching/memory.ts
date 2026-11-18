import "server-only";
import { cache } from "react";
import { z } from "zod";
import {
  factCategories,
  factLimit,
  factOrigins,
  type Fact,
  type FactInput,
  type StaffFactInput,
} from "@/features/coach/memory";
import type { OnboardingContext } from "@/server/onboarding/context";

const rowSchema = z.object({
  id: z.uuid(),
  category: z.enum(factCategories),
  text: z.string(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  origin: z.enum(factOrigins),
  basis: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const columns =
  "id, category, text, starts_on, ends_on, origin, basis, confirmed_at, created_at, updated_at";

function toFact(row: z.output<typeof rowSchema>): Fact {
  return {
    id: row.id,
    category: row.category,
    text: row.text,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    origin: row.origin,
    basis: row.basis,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function selectFacts(context: OnboardingContext): Promise<Fact[]> {
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
    .map(toFact);
}

export const readFacts = cache(selectFacts);

const normalized = (text: string) =>
  text.trim().replace(/\s+/g, " ").toLowerCase();

export async function recordStaffFact(
  context: OnboardingContext,
  input: StaffFactInput,
): Promise<
  { outcome: "created" | "existing"; fact: Fact } | { outcome: "limit" }
> {
  const known = await selectFacts(context);
  const existing = known.find(
    (fact) =>
      fact.category === input.category &&
      normalized(fact.text) === normalized(input.text),
  );
  if (existing) {
    if (input.source === "said" && existing.origin === "observed") {
      const { data, error } = await context.client
        .from("athlete_facts")
        .update({ origin: "said", basis: null, confirmed_at: null })
        .eq("user_id", context.userId)
        .eq("id", existing.id)
        .select(columns)
        .single();
      if (error) throw new Error("Unable to record the athlete fact");
      return { outcome: "existing", fact: toFact(rowSchema.parse(data)) };
    }
    return { outcome: "existing", fact: existing };
  }
  const { data, error } = await context.client
    .from("athlete_facts")
    .insert({
      user_id: context.userId,
      category: input.category,
      text: input.text,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      origin: input.source,
      basis: input.basis,
    })
    .select(columns)
    .single();
  if (error?.message.includes("athlete_facts_limit"))
    return { outcome: "limit" };
  if (error) throw new Error("Unable to record the athlete fact");
  return { outcome: "created", fact: toFact(rowSchema.parse(data)) };
}

export async function insertFact(
  context: OnboardingContext,
  input: FactInput,
): Promise<"saved" | "limit"> {
  const { error } = await context.client.from("athlete_facts").insert({
    user_id: context.userId,
    category: input.category,
    text: input.text,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
  });
  if (error?.message.includes("athlete_facts_limit")) return "limit";
  if (error) throw new Error("Unable to record the athlete fact");
  return "saved";
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
      origin: "said",
      basis: null,
      confirmed_at: null,
    })
    .eq("user_id", context.userId)
    .eq("id", id)
    .select("id");
  if (error) throw new Error("Unable to correct the athlete fact");
  return (data ?? []).length > 0;
}

export async function confirmFact(context: OnboardingContext, id: string) {
  const { data, error } = await context.client
    .from("athlete_facts")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("user_id", context.userId)
    .eq("id", id)
    .eq("origin", "observed")
    .is("confirmed_at", null)
    .select("id");
  if (error) throw new Error("Unable to confirm the athlete fact");
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
