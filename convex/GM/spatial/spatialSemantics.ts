import { distance } from '../../util/geometry';
import { GMRuntimeContext, GMSemanticLocation } from '../gmTypes';
import { buildSceneGraph, GMSceneGraph } from './sceneGraph';
import { resolveNearbyObjects } from './objectResolver';
import { resolveRoom } from './zoneResolver';

export function buildSemanticLocationForAgent(
  context: GMRuntimeContext,
  agentId: string,
  sceneGraph?: GMSceneGraph,
): GMSemanticLocation {
  const actor = context.actors.find((item) => item.agentId === agentId);
  if (!actor) {
    throw new Error(`Unknown agent ${agentId}`);
  }
  const room = resolveRoom(actor.position, context);
  const objectResult = resolveNearbyObjects({
    agentPosition: actor.position,
    semanticLocation: {
      actorId: agentId,
      roomId: room.roomId,
      roomName: room.roomName,
      zoneId: room.zoneId,
      zoneName: room.zoneName,
      nearbyObjectIds: [],
      interactiveObjectIds: [],
    },
    objects: context.objects,
    sceneGraph,
  });
  return {
    actorId: agentId,
    roomId: room.roomId,
    roomName: room.roomName,
    zoneId: room.zoneId,
    zoneName: room.zoneName,
    nearbyObjectIds: objectResult.nearbyObjects.map((object) => object.id),
    interactiveObjectIds: objectResult.interactableObjects.map((object) => object.id),
  };
}

export function buildSemanticLocation(context: GMRuntimeContext, agentId: string) {
  return buildSemanticLocationForAgent(context, agentId, buildSceneGraph(context));
}

/**
 * Produce a compact natural-language summary that can be appended to prompts
 * or written to debug logs without exposing unauthorized hidden facts.
 */
export function buildSpatialSummaryForAgent(
  context: GMRuntimeContext,
  agentId: string,
  sceneGraph?: GMSceneGraph,
) {
  const actor = context.actors.find((item) => item.agentId === agentId);
  if (!actor) {
    throw new Error(`Unknown agent ${agentId}`);
  }
  const graph = sceneGraph ?? buildSceneGraph(context);
  const semanticLocation = buildSemanticLocationForAgent(context, agentId, graph);
  const nearbyObjects = semanticLocation.nearbyObjectIds
    .map((objectId) => context.objects.find((object) => object.id === objectId)?.name ?? objectId);
  const nearbyAgents = context.actors
    .filter((candidate) => candidate.agentId !== agentId)
    .filter((candidate) => distance(actor.position, candidate.position) <= 3)
    .map((candidate) => candidate.name);

  const lines = [`${actor.name} is in ${semanticLocation.roomName}.`];
  if (nearbyObjects.length > 0) {
    lines.push(`${actor.name} is near ${nearbyObjects[0]}.`);
  }
  for (const objectId of semanticLocation.nearbyObjectIds) {
    const object = context.objects.find((candidate) => candidate.id === objectId);
    if (object?.parentObjectId) {
      const parent = context.objects.find((candidate) => candidate.id === object.parentObjectId);
      lines.push(`${object.name} is on ${parent?.name ?? object.parentObjectId}.`);
    }
  }
  if (nearbyAgents.length > 0) {
    lines.push(`${nearbyAgents.join(', ')} ${nearbyAgents.length === 1 ? 'is' : 'are'} near ${actor.name}.`);
  }
  return lines.join('\n');
}

export function buildSpatialSemantics(context: GMRuntimeContext) {
  const graph = buildSceneGraph(context);
  const semantics = new Map<string, GMSemanticLocation>();
  for (const actor of context.actors) {
    semantics.set(actor.agentId, buildSemanticLocationForAgent(context, actor.agentId, graph));
  }
  return semantics;
}
