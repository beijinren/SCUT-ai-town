export const DEFAULT_SCENE_ID = 'interview_room';

export const mapConfigs = {
  interview_room: {
    sceneId: 'interview_room',
    inputJson: 'data/unity/interview_room.json',
    outputModule: 'data/maps/generated/interviewRoom.ts',
    tilesetPath: '/ai-town/assets/maps/interview_room/tileset.png',
    tilesetPixelWidth: 384,
    tilesetPixelHeight: 416,
    exportedName: 'interviewRoom',
    blockedRects: [
      { minX: 0, minY: 0, maxX: 24, maxY: 4 },
      { minX: 0, minY: 0, maxX: 0, maxY: 15 },
      { minX: 24, minY: 0, maxX: 24, maxY: 15 },
      { minX: 0, minY: 15, maxX: 24, maxY: 15 },
    ],
  },
};

export function getMapConfig(sceneId) {
  const config = mapConfigs[sceneId];
  if (!config) {
    const knownScenes = Object.keys(mapConfigs).join(', ');
    throw new Error(
      `Unknown sceneId "${sceneId}". Known scenes: ${knownScenes || '(none)'}`,
    );
  }
  return config;
}
