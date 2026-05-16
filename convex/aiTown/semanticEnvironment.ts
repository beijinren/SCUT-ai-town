import { ObjectType, v } from 'convex/values';
import { distance } from '../util/geometry';
import { point } from '../util/types';
import { blockedWithPositions } from './movement';
import type { SerializedPlayer } from './player';
import type { InteractionTargetCandidate } from './interactionTiming';
import type { SemanticObject, SemanticZone } from './worldMap';
import { WorldMap } from './worldMap';

const APPROACH_AREA_TAGS = new Set([
  'low_pressure',
  'greeting',
  'discussion',
  'interview',
  'presentation',
  'formal',
  'public_focus',
  'observation',
  'meeting',
]);

const OBJECT_AFFORDANCE_WEIGHTS: Record<string, number> = {
  discuss: 1.4,
  review_document: 1.3,
  hold_meeting: 1.2,
  reference_in_conversation: 1.1,
  show_information: 1.1,
  explain: 1.1,
  present: 1.1,
  greet_nearby: 0.9,
  sit_near: 0.8,
  inspect: 0.6,
  look_at: 0.5,
  observe: 0.4,
  stand_near: 0.4,
  enter: 0.4,
  exit: 0.3,
  write: 0.8,
};

const AREA_TAG_WEIGHTS: Record<string, number> = {
  waiting: 0.6,
  entrance: 0.6,
  meeting: 1.2,
  interview: 1.3,
  discussion: 1.1,
  presentation: 1.2,
  observation: 0.7,
  low_pressure: 0.8,
  formal: 0.8,
  public_focus: 0.9,
};

const semanticAreaSnapshot = {
  id: v.string(),
  name: v.string(),
  roomId: v.string(),
  tags: v.array(v.string()),
  socialMeaning: v.optional(v.string()),
};

const semanticObjectSnapshot = {
  id: v.string(),
  name: v.string(),
  kind: v.optional(v.string()),
  x: v.number(),
  y: v.number(),
  distance: v.number(),
  roomId: v.optional(v.string()),
  zoneId: v.optional(v.string()),
  parentObjectId: v.optional(v.string()),
  interactive: v.boolean(),
  blocking: v.boolean(),
  tags: v.array(v.string()),
  affordances: v.array(v.string()),
  description: v.optional(v.string()),
};

const semanticPlayerSnapshot = {
  playerId: v.string(),
  distance: v.number(),
  currentAreaId: v.optional(v.string()),
  currentAreaName: v.optional(v.string()),
  sameArea: v.boolean(),
  sameRoom: v.boolean(),
  doingActivity: v.boolean(),
  activityDescription: v.optional(v.string()),
  nearbyObjectIds: v.array(v.string()),
};

const semanticActionCandidate = {
  kind: v.union(
    v.literal('approach_player'),
    v.literal('move_to_object'),
    v.literal('move_to_area'),
    v.literal('wait'),
  ),
  label: v.string(),
  score: v.number(),
  reasons: v.array(v.string()),
  targetPlayerId: v.optional(v.string()),
  targetObjectId: v.optional(v.string()),
  targetAreaId: v.optional(v.string()),
  destination: v.optional(point),
};

export const serializedSemanticEnvironmentContext = {
  currentArea: v.optional(v.object(semanticAreaSnapshot)),
  nearbyObjects: v.array(v.object(semanticObjectSnapshot)),
  nearbyPlayers: v.array(v.object(semanticPlayerSnapshot)),
  candidatePlayerContexts: v.array(v.object(semanticPlayerSnapshot)),
  environmentHints: v.array(v.string()),
};

export const serializedSemanticActionCandidate = semanticActionCandidate;

export type SemanticAreaSnapshot = ObjectType<typeof semanticAreaSnapshot>;
export type SemanticObjectSnapshot = ObjectType<typeof semanticObjectSnapshot>;
export type SemanticPlayerSnapshot = ObjectType<typeof semanticPlayerSnapshot>;
export type SemanticEnvironmentContext = ObjectType<
  typeof serializedSemanticEnvironmentContext
>;
export type SemanticActionCandidate = ObjectType<typeof semanticActionCandidate>;

function normalizeTags(values?: string[]) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function areaSnapshot(zone?: SemanticZone): SemanticAreaSnapshot | undefined {
  if (!zone) {
    return undefined;
  }
  return {
    id: zone.id,
    name: zone.name,
    roomId: zone.roomId,
    tags: normalizeTags(zone.tags),
    socialMeaning: zone.socialMeaning,
  };
}

function objectSnapshot(object: SemanticObject, from: { x: number; y: number }): SemanticObjectSnapshot {
  return {
    id: object.id,
    name: object.name,
    kind: object.kind,
    x: object.x,
    y: object.y,
    distance: distance(from, { x: object.x, y: object.y }),
    roomId: object.roomId || undefined,
    zoneId: object.zoneId || undefined,
    parentObjectId: object.parentObjectId || undefined,
    interactive: Boolean(object.interactive),
    blocking: Boolean(object.blocking),
    tags: normalizeTags(object.tags),
    affordances: normalizeTags(object.affordances),
    description: object.description,
  };
}

function playerSemanticSnapshot(args: {
  selfPosition: { x: number; y: number };
  player: SerializedPlayer;
  map: WorldMap;
}): SemanticPlayerSnapshot {
  const currentArea = args.map.getZoneAt(args.player.position);
  const nearbyObjects = args.map
    .getNearbyObjects(args.player.position, 3.5)
    .map((object) => object.id);
  const selfArea = args.map.getZoneAt(args.selfPosition);
  return {
    playerId: args.player.id,
    distance: distance(args.selfPosition, args.player.position),
    currentAreaId: currentArea?.id,
    currentAreaName: currentArea?.name,
    sameArea: Boolean(currentArea?.id && selfArea?.id && currentArea.id === selfArea.id),
    sameRoom: Boolean(
      (currentArea?.roomId && selfArea?.roomId && currentArea.roomId === selfArea.roomId) ||
        (!currentArea && !selfArea),
    ),
    doingActivity: Boolean(args.player.activity),
    activityDescription: args.player.activity?.description,
    nearbyObjectIds: nearbyObjects,
  };
}

function buildEnvironmentHints(
  currentArea: SemanticAreaSnapshot | undefined,
  nearbyObjects: SemanticObjectSnapshot[],
  nearbyPlayers: SemanticPlayerSnapshot[],
) {
  const hints: string[] = [];
  if (currentArea?.socialMeaning) {
    hints.push(`当前区域“${currentArea.name}”的社交语义：${currentArea.socialMeaning}`);
  }
  if (nearbyObjects.length > 0) {
    const leadObject = nearbyObjects[0];
    const affordanceText =
      leadObject.affordances.length > 0
        ? `可触发行为：${leadObject.affordances.join('、')}`
        : '当前未标注明确 affordance';
    hints.push(`附近关键物品是“${leadObject.name}”，${affordanceText}。`);
  }
  if (nearbyPlayers.length > 0) {
    hints.push(`附近可见 ${nearbyPlayers.length} 名角色，具备主动互动基础。`);
  }
  return hints;
}

function scoreAreaBias(area?: SemanticAreaSnapshot) {
  if (!area) {
    return { score: 0, reason: undefined as string | undefined };
  }
  const matchedTags = area.tags.filter((tag) => APPROACH_AREA_TAGS.has(tag));
  if (matchedTags.length === 0) {
    return { score: 0, reason: undefined as string | undefined };
  }
  return {
    score: Math.min(1.2, matchedTags.length * 0.35),
    reason: `当前位于“${area.name}”，区域标签 ${matchedTags.join('、')} 更支持自然互动。`,
  };
}

function scoreObjectAffordances(object: SemanticObjectSnapshot) {
  let score = 0;
  const reasons: string[] = [];
  for (const affordance of object.affordances) {
    const weight = OBJECT_AFFORDANCE_WEIGHTS[affordance];
    if (!weight) {
      continue;
    }
    score += weight;
    reasons.push(`物品“${object.name}”支持 ${affordance}。`);
  }
  return { score, reasons };
}

function scoreAreaForMovement(area: SemanticAreaSnapshot) {
  let score = 0;
  const reasons: string[] = [];
  for (const tag of area.tags) {
    const weight = AREA_TAG_WEIGHTS[tag];
    if (!weight) {
      continue;
    }
    score += weight;
    reasons.push(`区域“${area.name}”具备 ${tag} 标签。`);
  }
  if (area.socialMeaning) {
    score += 0.4;
    reasons.push(`区域语义提示：${area.socialMeaning}`);
  }
  return { score, reasons };
}

function candidatePointsAround(origin: { x: number; y: number }, radius = 2) {
  const points: Array<{ x: number; y: number }> = [];
  for (let r = 0; r <= radius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r && r !== 0) {
          continue;
        }
        points.push({ x: origin.x + dx, y: origin.y + dy });
      }
    }
  }
  return points;
}

function findNavigableDestination(args: {
  map: WorldMap;
  origin: { x: number; y: number };
  otherPlayers: SerializedPlayer[];
  selfPlayerId: string;
  maxRadius?: number;
}): { x: number; y: number } | undefined {
  const otherPositions = args.otherPlayers
    .filter((player) => player.id !== args.selfPlayerId)
    .map((player) => player.position);
  const maxRadius = args.maxRadius ?? 4;
  for (let radius = 0; radius <= maxRadius; radius++) {
    for (const point of candidatePointsAround(args.origin, radius)) {
      const candidate = { x: Math.round(point.x), y: Math.round(point.y) };
      if (blockedWithPositions(candidate, otherPositions, args.map) === null) {
        return candidate;
      }
    }
  }
  return undefined;
}

function zoneCenter(zone: SemanticZone) {
  const bounds = zone.bounds;
  if (!bounds) {
    return undefined;
  }
  return {
    x: Math.round((bounds.minX + bounds.maxX) / 2),
    y: Math.round((bounds.minY + bounds.maxY) / 2),
  };
}

export function buildSemanticEnvironmentContext(args: {
  map: WorldMap;
  player: SerializedPlayer;
  knownPlayers: SerializedPlayer[];
}): SemanticEnvironmentContext {
  const currentArea = areaSnapshot(args.map.getZoneAt(args.player.position));
  const nearbyObjects = args.map
    .getNearbyObjects(args.player.position, 3.5)
    .map((object) => objectSnapshot(object, args.player.position))
    .sort((left, right) => left.distance - right.distance);
  const allPlayerContexts = args.knownPlayers
    .filter((candidate) => candidate.id !== args.player.id)
    .map((candidate) =>
      playerSemanticSnapshot({
        selfPosition: args.player.position,
        player: candidate,
        map: args.map,
      }),
    )
    .sort((left, right) => left.distance - right.distance);
  const nearbyPlayers = allPlayerContexts.filter((candidate) => candidate.distance <= 5);
  return {
    currentArea,
    nearbyObjects,
    nearbyPlayers,
    candidatePlayerContexts: allPlayerContexts,
    environmentHints: buildEnvironmentHints(currentArea, nearbyObjects, nearbyPlayers),
  };
}

function objectFocusPoint(
  map: WorldMap,
  objectId: string,
  seen = new Set<string>(),
): { x: number; y: number } | undefined {
  if (seen.has(objectId)) {
    return undefined;
  }
  seen.add(objectId);
  const marker = map.getFocusPointForObject(objectId);
  if (marker) {
    return { x: marker.x, y: marker.y };
  }
  const object = map.objects.find((candidate) => candidate.id === objectId);
  if (!object) {
    return undefined;
  }
  if (object.parentObjectId) {
    const parentFocusPoint: { x: number; y: number } | undefined = objectFocusPoint(
      map,
      object.parentObjectId,
      seen,
    );
    if (parentFocusPoint) {
      return parentFocusPoint;
    }
  }
  return { x: object.x, y: object.y };
}

export function buildSemanticActionCandidates(args: {
  map: WorldMap;
  player: SerializedPlayer;
  knownPlayers: SerializedPlayer[];
  interactionCandidates: InteractionTargetCandidate[];
  environmentContext: SemanticEnvironmentContext;
}): SemanticActionCandidate[] {
  const areaBias = scoreAreaBias(args.environmentContext.currentArea);
  const actions: SemanticActionCandidate[] = [];
  const seenPlayers = new Set<string>();

  for (const candidate of args.interactionCandidates) {
    if (seenPlayers.has(candidate.player.id)) {
      continue;
    }
    seenPlayers.add(candidate.player.id);
    const playerContext = args.environmentContext.candidatePlayerContexts.find(
      (item) => item.playerId === candidate.player.id,
    );
    const reasons: string[] = [];
    let score = 0;
    if (playerContext) {
      if (playerContext.sameArea) {
        score += 1.5;
        reasons.push('目标与自己在同一区域，主动靠近更自然。');
      } else if (playerContext.sameRoom) {
        score += 0.75;
        reasons.push('目标与自己处在同一房间，接触成本较低。');
      }
      if (!playerContext.doingActivity) {
        score += 0.6;
        reasons.push('目标当前没有活动占用，更适合被接触。');
      }
      const sharedObjectIds = playerContext.nearbyObjectIds.filter((objectId) =>
        args.environmentContext.nearbyObjects.some((object) => object.id === objectId),
      );
      if (sharedObjectIds.length > 0) {
        score += 1;
        const sharedObjectName =
          args.map.objects.find((object) => object.id === sharedObjectIds[0])?.name ??
          sharedObjectIds[0];
        reasons.push(`双方都靠近“${sharedObjectName}”，容易形成自然话题。`);
      }
    }
    if (areaBias.reason) {
      score += areaBias.score;
      reasons.push(areaBias.reason);
    }
    actions.push({
      kind: 'approach_player',
      label: `靠近 ${candidate.player.id}`,
      score,
      reasons,
      targetPlayerId: candidate.player.id,
    });
  }

  const relevantObjects = args.map.objects
    .filter((object) => Boolean(object.interactive))
    .filter((object) => {
      if (args.environmentContext.currentArea?.id) {
        return object.zoneId === args.environmentContext.currentArea.id;
      }
      if (args.environmentContext.currentArea?.roomId) {
        return object.roomId === args.environmentContext.currentArea.roomId;
      }
      return true;
    });
  const seenObjects = new Set<string>();
  for (const object of relevantObjects) {
    if (seenObjects.has(object.id)) {
      continue;
    }
    seenObjects.add(object.id);
    const snapshot = objectSnapshot(object, args.player.position);
    const destination = findNavigableDestination({
      map: args.map,
      origin: objectFocusPoint(args.map, object.id) ?? { x: object.x, y: object.y },
      otherPlayers: args.knownPlayers,
      selfPlayerId: args.player.id,
      maxRadius: object.parentObjectId ? 5 : 4,
    });
    if (!destination) {
      continue;
    }
    const { score: affordanceScore, reasons } = scoreObjectAffordances(snapshot);
    if (affordanceScore <= 0) {
      continue;
    }
    const score = affordanceScore + (snapshot.distance > 6 ? 0.2 : 0.6);
    actions.push({
      kind: 'move_to_object',
      label: `移动到 ${object.name}`,
      score,
      reasons,
      targetObjectId: object.id,
      destination,
    });
  }

  for (const zone of args.map.zones) {
    if (zone.id === args.environmentContext.currentArea?.id) {
      continue;
    }
    const area = areaSnapshot(zone);
    if (!area) {
      continue;
    }
    const destination = zoneCenter(zone)
      ? findNavigableDestination({
          map: args.map,
          origin: zoneCenter(zone)!,
          otherPlayers: args.knownPlayers,
          selfPlayerId: args.player.id,
        })
      : undefined;
    if (!destination) {
      continue;
    }
    const { score, reasons } = scoreAreaForMovement(area);
    if (score <= 0) {
      continue;
    }
    actions.push({
      kind: 'move_to_area',
      label: `移动到 ${area.name}`,
      score,
      reasons,
      targetAreaId: area.id,
      destination,
    });
  }

  actions.push({
    kind: 'wait',
    label: '先观察',
    score: 0.25,
    reasons: ['当前先维持观察，等待更强的互动信号。'],
  });

  return actions.sort((left, right) => right.score - left.score);
}
