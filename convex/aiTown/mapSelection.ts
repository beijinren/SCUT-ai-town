import type { DatabaseReader, MutationCtx } from '../_generated/server';
import { DEFAULT_MAP_ID, MapId, isKnownMapId } from '../../data/maps/registry';

const DEFAULT_MAP_SELECTION_KEY = 'default';

export async function getSelectedMapId(db: DatabaseReader): Promise<MapId> {
  const selection = await (db as any)
    .query('mapSelections')
    .withIndex('key', (q: any) => q.eq('key', DEFAULT_MAP_SELECTION_KEY))
    .unique();
  if (selection?.selectedMapId && isKnownMapId(selection.selectedMapId)) {
    return selection.selectedMapId;
  }
  return DEFAULT_MAP_ID;
}

export async function setSelectedMapId(ctx: MutationCtx, mapId: MapId) {
  const now = Date.now();
  const selection = await (ctx.db as any)
    .query('mapSelections')
    .withIndex('key', (q: any) => q.eq('key', DEFAULT_MAP_SELECTION_KEY))
    .unique();
  if (selection) {
    await ctx.db.patch(selection._id, {
      selectedMapId: mapId,
      updatedAt: now,
    });
    return;
  }
  await (ctx.db as any).insert('mapSelections', {
    key: DEFAULT_MAP_SELECTION_KEY,
    selectedMapId: mapId,
    updatedAt: now,
  });
}
