import * as interviewRoom from './generated/interviewRoom';
import { DEFAULT_MAP_ID as DEFAULT_CATALOG_MAP_ID, getMapDefinition } from './mapCatalog.js';

export const DEFAULT_MAP_ID = DEFAULT_CATALOG_MAP_ID;

export const mapRegistry = {
  interview_room: interviewRoom,
};

export type MapId = keyof typeof mapRegistry;
export type MapModule = (typeof mapRegistry)[MapId];

export function getMapById(mapId: MapId): MapModule {
  return mapRegistry[mapId];
}

export function getMapRuntimeTuning(mapId: MapId) {
  return getMapDefinition(mapId).runtimeTuning ?? {};
}
