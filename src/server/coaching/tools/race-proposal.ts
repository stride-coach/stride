import "server-only";
import { z } from "zod";
import {
  raceStrategySchema,
  type NutritionProposal,
  type RaceProposalKind,
  type RaceStrategy,
} from "@/features/races/proposals";
import { isSegmentBoundary } from "@/features/races/waypoints";
import { courseModel } from "@/features/races/workspace";
import { readWorkspace } from "@/server/races/races";
import { defineTool, type ToolContext } from "./define";
import { toolError } from "./errors";

export async function submitRaceProposal(
  context: ToolContext,
  args: {
    raceId: string;
    kind: RaceProposalKind;
    title: string;
    summary: string | null;
    payload: RaceStrategy | NutritionProposal;
  },
) {
  const { data, error } = await context.client.rpc("submit_race_proposal", {
    p_race_id: args.raceId,
    p_kind: args.kind,
    p_title: args.title,
    p_payload: args.payload,
    ...(args.summary ? { p_summary: args.summary } : {}),
    ...(context.coachSessionId
      ? { p_coach_session_id: context.coachSessionId }
      : {}),
  });
  if (error?.message === "not_found") throw toolError("not_found");
  if (error?.message === "invalid_proposal")
    throw toolError("validation_failed", { reason: "invalid_proposal" });
  if (error || !data) throw new Error("Unable to submit the race proposal");
  return data;
}

const text = (max: number) => z.string().trim().min(1).max(max);

export const proposeRaceStrategyTool = defineTool({
  name: "propose_race_strategy",
  description:
    "Propose a race strategy to the athlete for one race, by race id. Stride stores it as a proposal: nothing changes until the athlete accepts it on the race's Plan de course tab, where it replaces the accepted strategy as a whole, so include every instruction and segment note you want to keep. Give at most six short race instructions (consignes), and per segment, identified by its arrival waypoint id from read_race_strategy, an optional note and an optional pace factor between 0.8 and 1.2 (above 1 slower, below 1 faster). Pace factors only redistribute time between segments: the target finish time stays fixed. A new proposal replaces the one still waiting. Call read_race_strategy first and quote its numbers in the summary.",
  class: "propose",
  dataClasses: ["training"],
  input: z.strictObject({
    raceId: z.string().min(1).max(64).describe("Race id."),
    title: text(120).describe("Short French title shown to the athlete."),
    summary: text(600)
      .nullable()
      .describe("One or two French sentences explaining the change."),
    consignes: z
      .array(text(240))
      .max(6)
      .describe("Race instructions in French, most important first."),
    segments: z
      .array(
        z.strictObject({
          arrivalWaypointId: z
            .uuid()
            .describe("Arrival waypoint id of the segment."),
          note: text(240)
            .nullable()
            .describe("French note for this segment, or null."),
          paceFactor: z
            .number()
            .min(0.8)
            .max(1.2)
            .nullable()
            .describe("Pace factor for this segment, or null for 1."),
        }),
      )
      .max(40)
      .describe("Segments with a note or a pace factor."),
  }),
  output: z.strictObject({
    proposalId: z.uuid(),
    raceId: z.uuid(),
  }),
  run: async (context, input) => {
    if (!z.uuid().safeParse(input.raceId).success) throw toolError("not_found");
    const data = await readWorkspace(context, input.raceId);
    if (!data) throw toolError("not_found");
    const arrivals = new Set(
      data.course
        ? courseModel(data.course, data.waypoints, data.plan, data.race.kind)
            .waypoints.filter(
              (waypoint) =>
                waypoint.distanceM > 0 && isSegmentBoundary(waypoint.kind),
            )
            .map((waypoint) => waypoint.id)
        : [],
    );
    const ids = input.segments.map((segment) => segment.arrivalWaypointId);
    const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicated.length)
      throw toolError("validation_failed", {
        reason: "duplicate_segment",
        message: "Each arrival waypoint id may appear only once.",
        arrivalWaypointIds: [...new Set(duplicated)],
      });
    const unknown = input.segments
      .map((segment) => segment.arrivalWaypointId)
      .filter((id) => !arrivals.has(id));
    if (unknown.length)
      throw toolError("validation_failed", {
        reason: data.course ? "unknown_segment" : "no_course",
        arrivalWaypointIds: unknown,
      });
    const payload = raceStrategySchema.parse({
      consignes: input.consignes,
      segments: Object.fromEntries(
        input.segments
          .filter(
            (segment) =>
              segment.note !== null ||
              (segment.paceFactor !== null && segment.paceFactor !== 1),
          )
          .map((segment) => [
            segment.arrivalWaypointId,
            {
              ...(segment.note !== null && { note: segment.note }),
              ...(segment.paceFactor !== null &&
                segment.paceFactor !== 1 && {
                  paceFactor: Math.round(segment.paceFactor * 100) / 100,
                }),
            },
          ]),
      ),
    });
    const proposalId = await submitRaceProposal(context, {
      raceId: input.raceId,
      kind: "strategy",
      title: input.title,
      summary: input.summary,
      payload,
    });
    return { proposalId, raceId: input.raceId };
  },
});
