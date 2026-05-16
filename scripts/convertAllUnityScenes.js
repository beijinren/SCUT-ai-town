import { mapConfigs } from './mapConfigs.js';
import { convertSceneById } from './convertUnityScene.js';

for (const sceneId of Object.keys(mapConfigs)) {
  convertSceneById(sceneId);
}
