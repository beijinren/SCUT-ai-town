/**
 * 地图运行时调参。所有距离单位都按 tile 计算，缩放相关参数按 fitScale 的倍数计算。
 * @typedef {{
 *   playerRenderScale?: number;
 *   defaultZoomMultiplier?: number;
 *   minZoomMultiplier?: number;
 *   maxZoomMultiplier?: number;
 *   playerCollisionThreshold?: number;
 *   conversationDistance?: number;
 * }} MapRuntimeTuning
 */

/**
 * 地图导入与运行配置。
 * @typedef {{
 *   mapId: string;
 *   exportedSceneId?: string;
 *   exportedSceneName?: string;
 *   inputJson: string;
 *   outputModule: string;
 *   tilesetPath: string;
 *   tilesetSourceFile: string;
 *   renderBackgroundLayers?: string[];
 *   renderObjectLayers?: string[];
 *   collisionLayers?: string[];
 *   blockedRects?: Array<{ minX: number; minY: number; maxX: number; maxY: number }>;
 *   runtimeTuning?: MapRuntimeTuning;
 * }} MapDefinition
 */

export const DEFAULT_MAP_ID = 'interview_room';

export const DEFAULT_RENDER_BACKGROUND_LAYERS = ['wall', 'bgtiles'];
export const DEFAULT_RENDER_OBJECT_LAYERS = ['obj_bot', 'objmap', 'obj_top', 'decoration'];
export const DEFAULT_COLLISION_LAYERS = ['wall', 'obj_bot', 'objmap', 'obj_top'];

/** @type {Record<string, MapDefinition>} */
export const mapCatalog = {
  interview_room: {
    mapId: 'interview_room',
    exportedSceneId: 'interview_room',
    exportedSceneName: 'Interview Room',
    inputJson: 'data/maps/interview_room/interview_room.json',
    outputModule: 'data/maps/generated/interviewRoom.ts',
    tilesetPath: '/ai-town/assets/maps/interview_room/interview_room_tileset.png',
    tilesetSourceFile: 'public/assets/maps/interview_room/interview_room_tileset.png',
    renderBackgroundLayers: DEFAULT_RENDER_BACKGROUND_LAYERS,
    renderObjectLayers: DEFAULT_RENDER_OBJECT_LAYERS,
    collisionLayers: DEFAULT_COLLISION_LAYERS,
    blockedRects: [],
    runtimeTuning: {
      playerRenderScale: 1.5,
      defaultZoomMultiplier: 1.38,
      minZoomMultiplier: 0.75,
      maxZoomMultiplier: 2.5,
      playerCollisionThreshold: 1.2,
      conversationDistance: 1.3,
    },
  },
};

/**
 * @param {string} mapId
 * @returns {MapDefinition}
 */
export function getMapDefinition(mapId) {
  const definition = mapCatalog[mapId];
  if (!definition) {
    const knownMaps = Object.keys(mapCatalog).join(', ');
    throw new Error(`Unknown mapId "${mapId}". Known maps: ${knownMaps || '(none)'}`);
  }
  return definition;
}
