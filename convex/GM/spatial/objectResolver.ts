import { distance } from '../../util/geometry';
import { gmConfig } from '../gmConfig';
import { GMSemanticLocation, GMSceneObject } from '../gmTypes';
import { Point } from '../../util/types';
import { GMSceneGraph, getChildren } from './sceneGraph';

export interface GMNearbyObjectResult {
  nearbyObjects: GMSceneObject[];
  interactableObjects: GMSceneObject[];
}

function flattenDescendantNames(graph: GMSceneGraph, objectId: string): string[] {
  return getChildren(graph, objectId).flatMap((child) => [child.name, ...flattenDescendantNames(graph, child.id)]);
}

function matchBySemanticLocation(
  semanticLocation: GMSemanticLocation,
  object: GMSceneObject,
) {
  return object.roomId === semanticLocation.roomId || object.zoneId === semanticLocation.zoneId;
}

/**
 * Demo-friendly object lookup that can work either from direct object positions
 * or from semantic containment in the scene graph.
 */
export function resolveNearbyObjects(args: {
  agentPosition?: Point;
  semanticLocation: GMSemanticLocation;
  objects: GMSceneObject[];
  sceneGraph?: GMSceneGraph;
  distanceThreshold?: number;
}): GMNearbyObjectResult {
  const threshold = args.distanceThreshold ?? gmConfig.sameRoomBonusDistance;
  const nearbyObjects = args.objects.filter((object) => {
    if (args.agentPosition && object.position) {
      return distance(args.agentPosition, object.position) <= threshold;
    }
    return matchBySemanticLocation(args.semanticLocation, object);
  });

  const interactableObjects = nearbyObjects.filter((object) => Boolean(object.interactive));

  // When the actor is near a container like CenterTable, expose its semantic descendants too.
  if (args.sceneGraph) {
    for (const object of [...nearbyObjects]) {
      const descendantNames = flattenDescendantNames(args.sceneGraph, object.id);
      for (const descendantName of descendantNames) {
        const descendant = args.objects.find((candidate) => candidate.name === descendantName);
        if (descendant && !nearbyObjects.some((candidate) => candidate.id === descendant.id)) {
          nearbyObjects.push(descendant);
        }
      }
    }
  }

  return { nearbyObjects, interactableObjects };
}

export function isNearObject(point: Point, object: GMSceneObject, maxDistance = gmConfig.interactionDistance) {
  if (!object.position) {
    return false;
  }
  return distance(point, object.position) <= maxDistance;
}
