import { v } from 'convex/values';
import { query } from './_generated/server';
import { conversationId } from './aiTown/ids';

export const getConversationInformationGraph = query({
  args: {
    worldId: v.id('worlds'),
    conversationId,
  },
  handler: async (ctx, args) => {
    return await (ctx.db as any)
      .query('informationGraphs')
      .withIndex('conversation', (q: any) =>
        q.eq('worldId', args.worldId).eq('conversationId', args.conversationId),
      )
      .unique();
  },
});

export const listInformationGraphs = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    return await (ctx.db as any)
      .query('informationGraphs')
      .withIndex('worldId', (q: any) => q.eq('worldId', args.worldId))
      .collect();
  },
});
