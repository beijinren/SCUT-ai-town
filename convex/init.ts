import { v } from 'convex/values';
import { internal } from './_generated/api';
import { DatabaseReader, MutationCtx, mutation } from './_generated/server';
import { getSceneTemplateForMap } from '../data/scenes';
import { insertInput } from './aiTown/insertInput';
import { Id } from './_generated/dataModel';
import { createEngine } from './aiTown/main';
import { ENGINE_ACTION_DURATION } from './constants';
import { detectMismatchedLLMProvider } from './util/llm';
import { getMapDefinition } from '../data/maps/mapCatalog.js';
import { getMapById, getMapRuntimeTuning, MapId } from '../data/maps/registry';
import { getSelectedMapId } from './aiTown/mapSelection';
import { ensureSceneRuntimeState, getSceneAgentDescriptionsForState } from './aiTown/sceneRuntime';

const init = mutation({
  args: {
    numAgents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    detectMismatchedLLMProvider();
    const mapId = await getSelectedMapId(ctx.db);
    const map = getMapById(mapId);
    const mapDefinition = getMapDefinition(mapId);
    const sceneTemplate = getSceneTemplateForMap(mapId);
    const sceneState = ensureSceneRuntimeState(sceneTemplate.protocol.worldSeed);
    const initialAgentDescriptions = getSceneAgentDescriptionsForState(sceneState);
    const spawnMarkers = (map.markers ?? []).filter((marker) => marker.type === 'Spawn');
    const spawnAssignments = buildSpawnAssignments(
      initialAgentDescriptions,
      spawnMarkers,
      mapDefinition.spawnRoleBindings,
    );
    const { worldStatus, engine } = await getOrCreateDefaultWorld(ctx, mapId);
    if (worldStatus.status !== 'running') {
      console.warn(
        `Engine ${engine._id} is not active! Run "npx convex run testing:resume" to restart it.`,
      );
      return;
    }
    const shouldCreate = await shouldCreateAgents(
      ctx.db,
      worldStatus.worldId,
      worldStatus.engineId,
    );
    if (shouldCreate) {
      const defaultAgentCount =
        spawnAssignments.length > 0 ? spawnAssignments.length : initialAgentDescriptions.length;
      const toCreate = args.numAgents !== undefined ? args.numAgents : defaultAgentCount;
      for (let i = 0; i < toCreate; i++) {
        const assignment = spawnAssignments[i];
        const description =
          assignment?.description ?? initialAgentDescriptions[i % initialAgentDescriptions.length];
        await insertInput(ctx, worldStatus.worldId, 'createAgent', {
          description,
          spawnPosition: assignment?.spawnPosition,
        });
      }
    }
  },
});
export default init;

async function getOrCreateDefaultWorld(ctx: MutationCtx, mapId: MapId) {
  const now = Date.now();
  const sceneTemplate = getSceneTemplateForMap(mapId);
  const sceneState = ensureSceneRuntimeState(sceneTemplate.protocol.worldSeed);

  let worldStatus = await ctx.db
    .query('worldStatus')
    .filter((q) => q.eq(q.field('isDefault'), true))
    .unique();
  if (worldStatus) {
    await upsertWorldMap(ctx, worldStatus.worldId, mapId);
    await ctx.db.patch(worldStatus.worldId, {
      sceneState,
    });
    const engine = (await ctx.db.get(worldStatus.engineId))!;
    return { worldStatus, engine };
  }

  const engineId = await createEngine(ctx);
  const engine = (await ctx.db.get(engineId))!;
  const worldId = await ctx.db.insert('worlds', {
    nextId: 0,
    agents: [],
    conversations: [],
    players: [],
    sceneState,
  });
  const worldStatusId = await ctx.db.insert('worldStatus', {
    engineId: engineId,
    isDefault: true,
    lastViewed: now,
    status: 'running',
    worldId: worldId,
  });
  worldStatus = (await ctx.db.get(worldStatusId))!;
  await upsertWorldMap(ctx, worldId, mapId);
  await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
    worldId,
    generationNumber: engine.generationNumber,
    maxDuration: ENGINE_ACTION_DURATION,
  });
  return { worldStatus, engine };
}

async function shouldCreateAgents(
  db: DatabaseReader,
  worldId: Id<'worlds'>,
  engineId: Id<'engines'>,
) {
  const world = await db.get(worldId);
  if (!world) {
    throw new Error(`Invalid world ID: ${worldId}`);
  }
  if (world.agents.length > 0) {
    return false;
  }
  const unactionedJoinInputs = await db
    .query('inputs')
    .withIndex('byInputNumber', (q) => q.eq('engineId', engineId))
    .order('asc')
    .filter((q) => q.eq(q.field('name'), 'createAgent'))
    .filter((q) => q.eq(q.field('returnValue'), undefined))
    .first();
  if (unactionedJoinInputs) {
    return false;
  }
  return true;
}

async function upsertWorldMap(ctx: MutationCtx, worldId: Id<'worlds'>, mapId: MapId) {
  const map = getMapById(mapId);
  const mapDefinition = getMapDefinition(mapId);
  const runtimeTuning = getMapRuntimeTuning(mapId);
  const markers = (map.markers ?? []).map((marker) => ({
    ...marker,
    role:
      marker.role ??
      (marker.id ? mapDefinition.spawnRoleBindings?.[marker.id] : undefined),
  }));
  const mapDoc = {
    worldId,
    width: map.mapwidth,
    height: map.mapheight,
    tileSetUrl: map.tilesetpath,
    tileSetDimX: map.tilesetpxw,
    tileSetDimY: map.tilesetpxh,
    tileDim: map.tiledim,
    bgTiles: map.bgtiles,
    objectTiles: map.objmap,
    collisionTiles: map.collisionmap ?? map.objmap,
    animatedSprites: map.animatedsprites,
    sceneId: map.sceneId,
    sceneName: map.sceneName,
    originX: map.originX,
    originY: map.originY,
    zones: map.zones,
    objects: map.objects,
    semanticAreas: map.semanticAreas,
    semanticObjects: map.semanticObjects,
    markers,
    tileRegistry: map.tileRegistry,
    runtimeTuning: map.runtimeTuning ?? runtimeTuning,
  };
  const existingMap = await ctx.db
    .query('maps')
    .withIndex('worldId', (q) => q.eq('worldId', worldId))
    .unique();
  if (existingMap) {
    await ctx.db.replace(existingMap._id, mapDoc);
    return;
  }
  await ctx.db.insert('maps', mapDoc);
}

function buildSpawnAssignments(
  agentDescriptions: ReturnType<typeof getSceneAgentDescriptionsForState>,
  spawnMarkers: Array<{ id?: string; x: number; y: number }>,
  spawnRoleBindings?: Record<string, string>,
) {
  if (spawnMarkers.length === 0) {
    return [];
  }

  if (!spawnRoleBindings || Object.keys(spawnRoleBindings).length === 0) {
    return agentDescriptions.map((description, index) => {
      const marker = spawnMarkers[index];
      return {
        description,
        spawnPosition: marker ? { x: marker.x, y: marker.y } : undefined,
      };
    });
  }

  const markerById = new Map(
    spawnMarkers
      .filter((marker): marker is { id: string; x: number; y: number } => typeof marker.id === 'string')
      .map((marker) => [marker.id, marker]),
  );

  return agentDescriptions.map((description) => {
    const markerId = Object.entries(spawnRoleBindings).find(
      ([, roleId]) => roleId === description.roleId,
    )?.[0];
    const marker = markerId ? markerById.get(markerId) : undefined;
    return {
      description,
      spawnPosition: marker ? { x: marker.x, y: marker.y } : undefined,
    };
  });
}
