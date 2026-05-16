import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { insertInput } from './aiTown/insertInput';
import { conversationId, playerId } from './aiTown/ids';
import { recordMessagePropagation } from './aiTown/informationGraphBridge';

export const listMessages = query({
  args: {
    worldId: v.id('worlds'),
    conversationId,
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('conversationId', (q) => q.eq('worldId', args.worldId).eq('conversationId', args.conversationId))
      .collect();
    const out = [];
    for (const message of messages) {
      const playerDescription = await ctx.db
        .query('playerDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', message.author))
        .first();
      if (!playerDescription) {
        throw new Error(`Invalid author ID: ${message.author}`);
      }
      out.push({ ...message, authorName: playerDescription.name });
    }
    return out;
  },
});

export const writeMessage = mutation({
  args: {
    worldId: v.id('worlds'),
    conversationId,
    messageUuid: v.string(),
    playerId,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`World ${args.worldId} not found`);
    }
    const conversation = world.conversations.find((item) => item.id === args.conversationId);
    const playerToAgentId = new Map(world.agents.map((agent) => [agent.playerId, agent.id]));
    const heardByAgentIds =
      conversation?.participants
        .map((participant) => playerToAgentId.get(participant.playerId))
        .filter((agentId): agentId is string => Boolean(agentId)) ?? [];
    const speakerAgentId = playerToAgentId.get(args.playerId) ?? `human:${args.playerId}`;
    const round = (conversation?.numMessages ?? 0) + 1;
    await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      author: args.playerId,
      messageUuid: args.messageUuid,
      text: args.text,
      worldId: args.worldId,
    });
    await recordMessagePropagation(ctx, {
      worldId: args.worldId,
      sceneId: world.sceneState?.sceneId,
      conversationId: args.conversationId,
      messageUuid: args.messageUuid,
      text: args.text,
      speakerAgentId,
      heardByAgentIds,
      round,
      createdAt: Date.now(),
    });
    await insertInput(ctx, args.worldId, 'finishSendingMessage', {
      conversationId: args.conversationId,
      playerId: args.playerId,
      timestamp: Date.now(),
    });
  },
});
