import {
  DEFAULT_MAP_ID,
  getMapDefinition,
  mapCatalog,
} from '../data/maps/mapCatalog.js';

export const DEFAULT_SCENE_ID = DEFAULT_MAP_ID;
export const mapConfigs = mapCatalog;

export function getMapConfig(sceneId) {
  return getMapDefinition(sceneId);
}

