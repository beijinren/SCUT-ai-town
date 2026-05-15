import { distance } from '../util/geometry';
import { Point } from '../util/types';
import { blockedWithPositions } from './movement';
import { SerializedPlayer } from './player';
import { SceneWorldSeed } from './sceneTypes';
import { SemanticArea, SemanticObject, WorldMap } from './worldMap';

export interface EnvironmentArea {
  id: string;
  name: string;
  type: string;
  tags: string[];
  socialMeaning: string;
}

export interface EnvironmentObject {
  id: string;
  name: string;
  type: string;
  distance: number;
  affordances: string[];
  tags: string[];
  interactable: boolean;
  description: string;
}

export interface EnvironmentPerson {
  playerId: string;
  distance: number;
  isInConversation: boolean;
  activity?: string;
}

export interface EnvironmentContext {
  playerId: string;
  currentArea?: EnvironmentArea;
  nearbyObjects: EnvironmentObject[];
  nearbyPeople: EnvironmentPerson[];
  environmentHints: string[];
}

export type SemanticActionCandidate =
  | {
      kind: 'approach_player';
      targetPlayerId: string;
      score: number;
      reasons: string[];
    }
  | {
      kind: 'move_to_object';
      targetObjectId: string;
      destination: Point;
      score: number;
      reasons: string[];
    }
  | {
      kind: 'move_to_area';
      targetAreaId: string;
      destination: Point;
      score: number;
      reasons: string[];
    }
  | {
      kind: 'wait';
      score: number;
      reasons: string[];
    };

export interface SemanticPersonInput {
  player: SerializedPlayer;
  isInConversation: boolean;
}

export interface EnvironmentWorldInput {
  players: SemanticPersonInput[];
}

function pointInArea(point: Point, area: SemanticArea) {
  return (
    point.x >= area.bounds.x &&
    point.x <= area.bounds.x + area.bounds.width &&
    point.y >= area.bounds.y &&
    point.y <= area.bounds.y + area.bounds.height
  );
}

function areaCenter(area: SemanticArea): Point {
  return {
    x: Math.floor(area.bounds.x + area.bounds.width / 2),
    y: Math.floor(area.bounds.y + area.bounds.height / 2),
  };
}

function objectDistance(player: SerializedPlayer, object: SemanticObject) {
  return distance(player.position, object.position);
}

function hasAny(values: string[], candidates: string[]) {
  return candidates.some((candidate) => values.includes(candidate));
}

function buildEnvironmentHints(area: EnvironmentArea | undefined, objects: EnvironmentObject[]) {
  const hints: string[] = [];
  if (area) {
    hints.push(`当前区域：${area.name}。${area.socialMeaning}`);
    if (hasAny(area.tags, ['低压力', '适合闲聊'])) {
      hints.push(`${area.name} 更适合自然、低压力的主动交流。`);
    }
    if (hasAny(area.tags, ['不宜打扰', '拥挤'])) {
      hints.push(`${area.name} 可能不适合贸然打扰别人。`);
    }
  }

  for (const object of objects.slice(0, 3)) {
    if (hasAny(object.affordances, ['casual_chat', 'ask_question', 'observe'])) {
      hints.push(`${object.name} 提供了自然互动理由：${object.affordances.join('、')}。`);
    }
  }
  return hints;
}

export function getEnvironmentContextForPlayer(
  player: SerializedPlayer,
  worldMap: WorldMap,
  world: EnvironmentWorldInput,
  options?: {
    objectRadius?: number;
    peopleRadius?: number;
  },
): EnvironmentContext {
  const objectRadius = options?.objectRadius ?? 6;
  const peopleRadius = options?.peopleRadius ?? 8;
  const currentArea = worldMap.semanticAreas.find((area) => pointInArea(player.position, area));
  const nearbyObjects = worldMap.semanticObjects
    .map((object) => ({
      id: object.id,
      name: object.name,
      type: object.type,
      distance: objectDistance(player, object),
      affordances: [...object.affordances],
      tags: [...object.tags],
      interactable: object.interactable,
      description: object.description,
    }))
    .filter((object) => object.distance <= objectRadius)
    .sort((left, right) => left.distance - right.distance);
  const nearbyPeople = world.players
    .filter((entry) => entry.player.id !== player.id)
    .map((entry) => {
      const person = {
        playerId: entry.player.id,
        distance: distance(player.position, entry.player.position),
        isInConversation: entry.isInConversation,
        ...(entry.player.activity?.description
          ? { activity: entry.player.activity.description }
          : {}),
      };
      return person;
    })
    .filter((person) => person.distance <= peopleRadius)
    .sort((left, right) => left.distance - right.distance);
  const areaContext = currentArea
    ? {
        id: currentArea.id,
        name: currentArea.name,
        type: currentArea.type,
        tags: [...currentArea.tags],
        socialMeaning: currentArea.socialMeaning,
      }
    : undefined;

  return {
    playerId: player.id,
    ...(areaContext ? { currentArea: areaContext } : {}),
    nearbyObjects,
    nearbyPeople,
    environmentHints: buildEnvironmentHints(areaContext, nearbyObjects),
  };
}

function isBlockedBySemanticObject(point: Point, worldMap: WorldMap) {
  return worldMap.semanticObjects.some(
    (object) =>
      object.blocking &&
      object.footprint.some(
        (footprintPoint) =>
          Math.floor(footprintPoint.x) === Math.floor(point.x) &&
          Math.floor(footprintPoint.y) === Math.floor(point.y),
      ),
  );
}

function isReachableCandidate(point: Point, worldMap: WorldMap, occupiedPositions: Point[]) {
  return !isBlockedBySemanticObject(point, worldMap) && !blockedWithPositions(point, occupiedPositions, worldMap);
}

export function selectReachablePointNearObject(
  object: SemanticObject,
  worldMap: WorldMap,
  occupiedPositions: Point[],
): Point | undefined {
  const base = {
    x: Math.floor(object.position.x),
    y: Math.floor(object.position.y),
  };
  const candidates: Point[] = [
    { x: base.x + 1, y: base.y },
    { x: base.x - 1, y: base.y },
    { x: base.x, y: base.y + 1 },
    { x: base.x, y: base.y - 1 },
    { x: base.x + 1, y: base.y + 1 },
    { x: base.x - 1, y: base.y - 1 },
  ];
  return candidates.find((candidate) => isReachableCandidate(candidate, worldMap, occupiedPositions));
}

export function selectReachablePointInArea(
  area: SemanticArea,
  worldMap: WorldMap,
  occupiedPositions: Point[],
): Point | undefined {
  const center = areaCenter(area);
  const candidates: Point[] = [
    center,
    { x: center.x + 1, y: center.y },
    { x: center.x - 1, y: center.y },
    { x: center.x, y: center.y + 1 },
    { x: center.x, y: center.y - 1 },
  ];
  return candidates.find(
    (candidate) => pointInArea(candidate, area) && isReachableCandidate(candidate, worldMap, occupiedPositions),
  );
}

function scoreArea(area: EnvironmentArea | undefined) {
  if (!area) {
    return { score: 0, reasons: [] as string[] };
  }
  let score = 0;
  const reasons: string[] = [];
  if (hasAny(area.tags, ['低压力', '适合闲聊'])) {
    score += 2;
    reasons.push(`${area.name} 是低压力/适合闲聊区域。`);
  }
  if (hasAny(area.tags, ['正式', '适合提问'])) {
    score += 1;
    reasons.push(`${area.name} 支持正式提问或观察。`);
  }
  if (hasAny(area.tags, ['不宜打扰', '拥挤'])) {
    score -= 2;
    reasons.push(`${area.name} 不适合贸然打扰。`);
  }
  return { score, reasons };
}

function scoreObject(object: EnvironmentObject) {
  let score = 0;
  const reasons: string[] = [];
  if (hasAny(object.affordances, ['casual_chat'])) {
    score += 3;
    reasons.push(`${object.name} 提供自然低压力开场理由。`);
  }
  if (hasAny(object.affordances, ['ask_question', 'observe'])) {
    score += 2;
    reasons.push(`${object.name} 适合观察或提出问题。`);
  }
  if (hasAny(object.affordances, ['wait', 'rest'])) {
    score += 1;
    reasons.push(`${object.name} 适合等待或短暂停留。`);
  }
  if (hasAny(object.affordances, ['avoid_disturbing']) || hasAny(object.tags, ['不宜打扰'])) {
    score -= 2;
    reasons.push(`${object.name} 暗示不要贸然打扰。`);
  }
  return { score, reasons };
}

export function buildInteractionCandidates(args: {
  player: SerializedPlayer;
  environmentContext: EnvironmentContext;
  sceneState?: SceneWorldSeed;
  worldMap: WorldMap;
  otherFreePlayers: SerializedPlayer[];
  occupiedPositions: Point[];
}): SemanticActionCandidate[] {
  const candidates: SemanticActionCandidate[] = [];
  const areaScore = scoreArea(args.environmentContext.currentArea);

  for (const person of args.environmentContext.nearbyPeople) {
    const freePlayer = args.otherFreePlayers.find((candidate) => candidate.id === person.playerId);
    if (!freePlayer) {
      continue;
    }
    let score = 1 + areaScore.score;
    const reasons = ['附近有人可以互动。', ...areaScore.reasons];
    if (person.distance <= 4) {
      score += 2;
      reasons.push('目标距离较近，主动接触成本低。');
    }
    if (person.activity) {
      score -= 2;
      reasons.push(`目标正在进行活动：${person.activity}。`);
    }
    candidates.push({
      kind: 'approach_player',
      targetPlayerId: person.playerId,
      score,
      reasons,
    });
  }

  for (const object of args.environmentContext.nearbyObjects) {
    const sourceObject = args.worldMap.semanticObjects.find((candidate) => candidate.id === object.id);
    if (!sourceObject || !object.interactable) {
      continue;
    }
    const objectScore = scoreObject(object);
    const destination = selectReachablePointNearObject(
      sourceObject,
      args.worldMap,
      args.occupiedPositions,
    );
    if (!destination) {
      continue;
    }
    candidates.push({
      kind: 'move_to_object',
      targetObjectId: object.id,
      destination,
      score: objectScore.score + Math.max(0, 3 - object.distance / 2),
      reasons: objectScore.reasons.length > 0 ? objectScore.reasons : [`${object.name} 是可交互物品。`],
    });
  }

  for (const area of args.worldMap.semanticAreas) {
    if (area.id === args.environmentContext.currentArea?.id) {
      continue;
    }
    const areaContext = {
      id: area.id,
      name: area.name,
      type: area.type,
      tags: [...area.tags],
      socialMeaning: area.socialMeaning,
    };
    const destination = selectReachablePointInArea(area, args.worldMap, args.occupiedPositions);
    const score = scoreArea(areaContext);
    if (!destination || score.score <= 0) {
      continue;
    }
    candidates.push({
      kind: 'move_to_area',
      targetAreaId: area.id,
      destination,
      score: score.score,
      reasons: score.reasons,
    });
  }

  candidates.push({
    kind: 'wait',
    score: args.environmentContext.currentArea && hasAny(args.environmentContext.currentArea.tags, ['不宜打扰'])
      ? 2
      : 0.5,
    reasons: ['当前没有足够强的主动互动理由时，等待是安全选择。'],
  });

  return candidates.sort((left, right) => right.score - left.score);
}
