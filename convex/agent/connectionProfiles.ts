import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';

export const connectionProfileConfig = v.object({
  baseUrl: v.string(),
  chatModel: v.string(),
  embeddingModel: v.string(),
  apiKey: v.string(),
});

export const connectionProfileRecord = v.object({
  name: v.string(),
  config: connectionProfileConfig,
  updatedAt: v.number(),
});

export const connectionProfileState = v.object({
  activeProfileName: v.string(),
  profiles: v.array(connectionProfileRecord),
  updatedAt: v.number(),
});

export type ConnectionProfileConfig = {
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  apiKey: string;
};

export type ConnectionProfileRecord = {
  name: string;
  config: ConnectionProfileConfig;
  updatedAt: number;
};

export type ConnectionProfileState = {
  activeProfileName: string;
  profiles: ConnectionProfileRecord[];
  updatedAt: number;
};

export const getConnectionState = query({
  args: {},
  handler: async (ctx): Promise<ConnectionProfileState | null> => {
    return await ctx.db.query('connectionProfileState').first();
  },
});

export const saveConnectionState = mutation({
  args: connectionProfileState,
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('connectionProfileState').first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert('connectionProfileState', args);
  },
});