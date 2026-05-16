import { COLLISION_THRESHOLD, CONVERSATION_DISTANCE } from '../constants';
import { WorldMap } from './worldMap';

export function getPlayerRenderScale(map: WorldMap) {
  return map.runtimeTuning.playerRenderScale ?? 1.5;
}

export function getDefaultZoomMultiplier(map: WorldMap) {
  return map.runtimeTuning.defaultZoomMultiplier ?? 1.38;
}

export function getMinZoomMultiplier(map: WorldMap) {
  return map.runtimeTuning.minZoomMultiplier ?? 0.75;
}

export function getMaxZoomMultiplier(map: WorldMap) {
  return map.runtimeTuning.maxZoomMultiplier ?? 2.5;
}

export function getPlayerCollisionThreshold(map: WorldMap) {
  return map.runtimeTuning.playerCollisionThreshold ?? COLLISION_THRESHOLD;
}

export function getConversationDistance(map: WorldMap) {
  return map.runtimeTuning.conversationDistance ?? CONVERSATION_DISTANCE;
}

