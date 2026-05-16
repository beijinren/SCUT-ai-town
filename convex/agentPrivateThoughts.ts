import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import { agentId, conversationId, playerId } from './aiTown/ids';

export const recordAgentPrivateThought = internalMutation({
  args: {
    worldId: v.id('worlds'),
    conversationId,
    turnId: v.string(),
    messageUuid: v.string(),
    agentId,
    playerId,
    isSpeaker: v.boolean(),
    thought: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await (ctx.db as any).insert('agentPrivateThoughts', args);
  },
});

export const listAgentPrivateThoughts = query({
  args: {
    worldId: v.id('worlds'),
    agentId,
  },
  handler: async (ctx, args) => {
    return await (ctx.db as any)
      .query('agentPrivateThoughts')
      .withIndex('agent', (q: any) => q.eq('worldId', args.worldId).eq('agentId', args.agentId))
      .order('desc')
      .take(50);
  },
});
