import * as interviewRoom from './interview_room/interviewRoomMap';
import * as hospitalWard from './hospital_ward/hospitalWardMap';
import { DEFAULT_MAP_ID as DEFAULT_CATALOG_MAP_ID, getMapDefinition } from './mapCatalog.js';

export const DEFAULT_MAP_ID = DEFAULT_CATALOG_MAP_ID;

export const mapRegistry = {
  interview_room: interviewRoom,
  hospital_ward: hospitalWard,
};

export type MapId = keyof typeof mapRegistry;
export type MapModule = (typeof mapRegistry)[MapId];
export const availableMapIds = Object.keys(mapRegistry) as MapId[];

export function isKnownMapId(mapId: string): mapId is MapId {
  return mapId in mapRegistry;
}

export function getMapById(mapId: MapId): MapModule {
  return mapRegistry[mapId];
}

export function getMapRuntimeTuning(mapId: MapId) {
  return getMapDefinition(mapId).runtimeTuning ?? {};
}

export function listAvailableMaps() {
  return availableMapIds.map((mapId) => {
    const definition = getMapDefinition(mapId);
    return {
      mapId,
      label: definition.exportedSceneName ?? definition.mapId,
      sceneId: definition.exportedSceneId ?? definition.mapId,
      sceneTemplateId: definition.sceneTemplateId,
    };
  });
}
