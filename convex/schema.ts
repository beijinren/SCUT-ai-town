import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { connectionProfileState } from "./agent/connectionProfiles";
import { agentTables } from "./agent/schema";
import { aiTownTables } from "./aiTown/schema";
import { agentId, conversationId, playerId } from "./aiTown/ids";
import { engineTables } from "./engine/schema";

export default defineSchema({
  connectionProfileState: defineTable(connectionProfileState),

  agentThoughtState: defineTable({
    playerId,
    agentId,
    thoughtLevel: v.string(),
    updatedAt: v.number(),
  })
    .index("agentId", ["agentId"])
    .index("playerAgentId", ["playerId", "agentId"]),

  music: defineTable({
    storageId: v.string(),
    type: v.union(v.literal("background"), v.literal("player")),
  }),

  messages: defineTable({
    conversationId,
    messageUuid: v.string(),
    author: playerId,
    text: v.string(),
    thought: v.optional(v.string()),
    worldId: v.optional(v.id("worlds")),
  })
    .index("conversationId", ["worldId", "conversationId"])
    .index("messageUuid", ["conversationId", "messageUuid"]),

  ...agentTables,
  ...aiTownTables,
  ...engineTables,
});
