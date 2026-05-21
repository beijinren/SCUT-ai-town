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
 *   sceneTemplateId: string;
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
 *   spawnRoleBindings?: Record<string, string>;
 *   defaultAgentCount?: number;
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
    sceneTemplateId: 'cross-major-creative-workshop-ai-town',
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
    spawnRoleBindings: {
      spawn_doctor_1: 'attending_doctor',
      spawn_family_1: 'bed_1_family',
      spawn_family_2: 'bed_2_family',
      spawn_left_patient: 'bed_1_patient',
      spawn_right_patient: 'bed_2_patient',
    },
    runtimeTuning: {
      playerRenderScale: 1.5,
      defaultZoomMultiplier: 1.38,
      minZoomMultiplier: 0.75,
      maxZoomMultiplier: 2.5,
      playerCollisionThreshold: 1.2,
      conversationDistance: 1.3,
    },
  },
  hospital_ward: {
    mapId: 'hospital_ward',
    sceneTemplateId: 'shared-ward-preop-two-goals',
    exportedSceneId: 'hospital_ward',
    exportedSceneName: 'Hospital Ward',
    inputJson: 'data/maps/hospital_ward/hospital_ward.json',
    outputModule: 'data/maps/generated/hospitalWard.ts',
    tilesetPath: '/ai-town/assets/maps/hospital_ward/hospital_ward_tileset.png',
    tilesetSourceFile: 'public/assets/maps/hospital_ward/hospital_ward_tileset.png',
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
  cafe_room: {
    mapId: 'cafe_room',
    sceneTemplateId: 'casual-common-area',
    exportedSceneId: 'cafe_room',
    exportedSceneName: 'Cafe Room',
    inputJson: 'data/maps/cafe_room/cafe_room.json',
    outputModule: 'data/maps/generated/cafeRoom.ts',
    tilesetPath: '/ai-town/assets/maps/cafe_room/cafe_room_tileset.png',
    tilesetSourceFile: 'public/assets/maps/cafe_room/cafe_room_tileset.png',
    renderBackgroundLayers: ['bgtiles'],
    renderObjectLayers: ['wall', 'obj_bot', 'objmap', 'obj_top', 'decoration'],
    collisionLayers: DEFAULT_COLLISION_LAYERS,
    blockedRects: [],
    defaultAgentCount: 3,
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
