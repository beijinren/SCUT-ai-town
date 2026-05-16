import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { isKnownMapId, listAvailableMaps } from '../data/maps/registry';
import { getSelectedMapId, setSelectedMapId } from './aiTown/mapSelection';

export const listSceneOptions = query({
  handler: async (ctx) => {
    const selectedMapId = await getSelectedMapId(ctx.db);
    return {
      selectedMapId,
      maps: listAvailableMaps(),
    };
  },
});

export const selectScene = mutation({
  args: {
    mapId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isKnownMapId(args.mapId)) {
      throw new Error(`Unknown mapId: ${args.mapId}`);
    }
    await setSelectedMapId(ctx, args.mapId);
    return {
      selectedMapId: args.mapId,
    };
  },
});
