import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * These tables are defined inside the GM module so the data contract lives next
 * to the GM logic. Wiring them into the root Convex schema can happen later.
 */
export const gmTables = {
  gmDebugLogs: defineTable({
    worldId: v.string(),
    agentId: v.string(),
    conversationId: v.optional(v.string()),
    eventId: v.optional(v.string()),
    rawOutput: v.string(),
    guardDecision: v.string(),
    interventionLevel: v.number(),
    reason: v.string(),
    visibleFactsSummary: v.array(v.string()),
    matchedHiddenFacts: v.array(v.string()),
    regeneratedOutput: v.optional(v.string()),
    createdAt: v.number(),
  }),

  gmFacts: defineTable({
    factId: v.string(),
    content: v.string(),
    visibility: v.string(),
    sceneId: v.string(),
    createdAt: v.number(),
  }),

  gmFactEdges: defineTable({
    factId: v.string(),
    fromAgentId: v.optional(v.string()),
    fromEventId: v.optional(v.string()),
    toAgentId: v.string(),
    sourceType: v.string(),
    evidence: v.optional(v.string()),
    createdAt: v.number(),
  }),

  gmRelationEdges: defineTable({
    fromAgentId: v.string(),
    toAgentId: v.string(),
    interactionCount: v.number(),
    lastInteractionAt: v.optional(v.number()),
    sharedEventIds: v.array(v.string()),
    relationSummary: v.string(),
    updatedAt: v.number(),
  }),

  gmWillingnessLogs: defineTable({
    conversationId: v.string(),
    triggerReason: v.string(),
    participants: v.array(v.string()),
    scores: v.array(
      v.object({
        agentId: v.string(),
        score: v.number(),
      }),
    ),
    ranking: v.array(v.string()),
    selectedNextSpeaker: v.optional(v.string()),
    createdAt: v.number(),
  }),
};
