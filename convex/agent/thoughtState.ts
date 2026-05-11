import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { GameId, agentId, playerId } from '../aiTown/ids';
import { THOUGHT_LEVELS, type ThoughtLevel } from './thoughtConfig';

export const getAgentIdByPlayerId = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args): Promise<GameId<'agents'> | null> => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`World ${args.worldId} not found`);
    }
    const agent = world.agents.find((candidate) => candidate.playerId === args.playerId);
    return (agent?.id as GameId<'agents'> | undefined) ?? null;
  },
});

export const getAgentThoughtLevel = query({
  args: {
    agentId,
    playerId,
  },
  handler: async (ctx, args): Promise<ThoughtLevel> => {
    const state = await ctx.db
      .query('agentThoughtState')
      .withIndex('playerAgentId', (q) => q.eq('playerId', args.playerId).eq('agentId', args.agentId))
      .first();
    return (state?.thoughtLevel as ThoughtLevel) || THOUGHT_LEVELS.INTUITION;
  },
});

export const setAgentThoughtLevel = mutation({
  args: {
    agentId,
    playerId,
    thoughtLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentThoughtState')
      .withIndex('playerAgentId', (q) => q.eq('playerId', args.playerId).eq('agentId', args.agentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        thoughtLevel: args.thoughtLevel,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('agentThoughtState', {
        playerId: args.playerId,
        agentId: args.agentId,
        thoughtLevel: args.thoughtLevel,
        updatedAt: Date.now(),
      });
    }
  },
});

