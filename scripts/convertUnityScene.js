import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_SCENE_ID, getMapConfig } from './mapConfigs.js';

const COLLISION_LAYER_ORDER = ['objmap', 'obj_bot', 'obj_top'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function parseSceneId(argv) {
  if (argv.length === 0) {
    return DEFAULT_SCENE_ID;
  }
  if (argv[0] === '--scene') {
    return argv[1] ?? DEFAULT_SCENE_ID;
  }
  const inlineSceneArg = argv.find((arg) => arg.startsWith('--scene='));
  if (inlineSceneArg) {
    return inlineSceneArg.slice('--scene='.length) || DEFAULT_SCENE_ID;
  }
  return argv[0];
}

function readSceneJson(inputJsonPath) {
  return JSON.parse(fs.readFileSync(inputJsonPath, 'utf8'));
}

function rowsToLayerXY(rows, width, height, layerName) {
  if (!Array.isArray(rows) || rows.length !== height) {
    throw new Error(
      `Layer "${layerName}" rows count mismatch: expected ${height}, got ${rows?.length ?? 0}`,
    );
  }

  const layer = Array.from({ length: width }, () => Array(height).fill(-1));
  for (let y = 0; y < height; y++) {
    const row = rows[y]?.tiles;
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(
        `Layer "${layerName}" row ${y} tiles count mismatch: expected ${width}, got ${row?.length ?? 0}`,
      );
    }
    for (let x = 0; x < width; x++) {
      layer[x][y] = row[x];
    }
  }
  return layer;
}

function collectVisualLayers(scene) {
  const sourceLayers = [
    ...(scene.bgLayers ?? []),
    ...((scene.visualLayers ?? []).filter((layer) => layer.name === 'decoration')),
  ];
  return sourceLayers.map((layer) =>
    rowsToLayerXY(layer.rows, scene.width, scene.height, layer.name),
  );
}

function collectRenderableObjectLayers(scene) {
  const visualLayerByName = new Map((scene.visualLayers ?? []).map((layer) => [layer.name, layer]));
  const collisionLayerByName = new Map(
    (scene.collisionLayers ?? []).map((layer) => [layer.name, layer]),
  );
  const orderedLayers = [
    visualLayerByName.get('obj_bot'),
    collisionLayerByName.get('objmap'),
    visualLayerByName.get('obj_top'),
  ].filter(Boolean);
  const sourceLayers = orderedLayers;
  return sourceLayers.map((layer) =>
    rowsToLayerXY(layer.rows, scene.width, scene.height, layer.name),
  );
}

function collectCollisionLayers(scene) {
  const collisionLayers = scene.collisionLayers ?? [];
  const visualLayers = scene.visualLayers ?? [];
  const layerByName = new Map(collisionLayers.map((layer) => [layer.name, layer]));
  const visualLayerByName = new Map(visualLayers.map((layer) => [layer.name, layer]));
  const layers = COLLISION_LAYER_ORDER.filter(
    (name) => layerByName.has(name) || visualLayerByName.has(name),
  ).map((name) => {
    const sourceLayer = layerByName.get(name) ?? visualLayerByName.get(name);
    return rowsToLayerXY(sourceLayer.rows, scene.width, scene.height, name);
  });

  if (layers.length === 0) {
    throw new Error(
      `Scene "${scene.sceneId}" does not contain any supported collision layer: ${COLLISION_LAYER_ORDER.join(', ')}`,
    );
  }
  if (!layerByName.has('objmap')) {
    throw new Error(`Scene "${scene.sceneId}" is missing required collision layer "objmap"`);
  }
  return layers;
}

function applyBlockedRects(layers, blockedRects, width, height) {
  if (!blockedRects?.length) {
    return layers;
  }
  const rectLayer = Array.from({ length: width }, () => Array(height).fill(-1));
  for (const rect of blockedRects) {
    for (let x = rect.minX; x <= rect.maxX; x++) {
      for (let y = rect.minY; y <= rect.maxY; y++) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
          continue;
        }
        rectLayer[x][y] = 0;
      }
    }
  }
  return [...layers, rectLayer];
}

function normalizePoint(scene, x, y) {
  return {
    x: x - scene.originX,
    y: scene.height - 1 - (y - scene.originY),
  };
}

function normalizeBounds(scene, minX, minY, maxX, maxY) {
  const normalizedMin = normalizePoint(scene, minX, minY);
  const normalizedMax = normalizePoint(scene, maxX, maxY);
  return {
    minX: Math.min(normalizedMin.x, normalizedMax.x),
    minY: Math.min(normalizedMin.y, normalizedMax.y),
    maxX: Math.max(normalizedMin.x, normalizedMax.x),
    maxY: Math.max(normalizedMin.y, normalizedMax.y),
  };
}

function normalizeZone(scene, zone) {
  return {
    ...zone,
    unityBounds: {
      minX: zone.minX,
      minY: zone.minY,
      maxX: zone.maxX,
      maxY: zone.maxY,
    },
    bounds: normalizeBounds(scene, zone.minX, zone.minY, zone.maxX, zone.maxY),
  };
}

function normalizePointEntity(scene, entity) {
  const point = normalizePoint(scene, entity.x, entity.y);
  return {
    ...entity,
    unityX: entity.x,
    unityY: entity.y,
    x: point.x,
    y: point.y,
  };
}

function buildGeneratedModule(scene, config) {
  const bgtiles = collectVisualLayers(scene);
  const objmap = collectRenderableObjectLayers(scene);
  const collisionmap = applyBlockedRects(
    collectCollisionLayers(scene),
    config.blockedRects,
    scene.width,
    scene.height,
  );
  const zones = (scene.zones ?? []).map((zone) => normalizeZone(scene, zone));
  const objects = (scene.objects ?? []).map((object) => normalizePointEntity(scene, object));
  const markers = (scene.markers ?? []).map((marker) => normalizePointEntity(scene, marker));
  const tileRegistry = scene.tileRegistry ?? [];
  const sceneName = scene.sceneName ?? config.sceneId;

  return `// Auto-generated from Unity export.
// Do not edit manually.

export const sceneId = ${JSON.stringify(scene.sceneId ?? config.sceneId)};
export const sceneName = ${JSON.stringify(sceneName)};

export const tilesetpath = ${JSON.stringify(config.tilesetPath)};
export const tiledim = ${scene.tileDim};
export const screenxtiles = ${scene.width};
export const screenytiles = ${scene.height};
export const tilesetpxw = ${config.tilesetPixelWidth};
export const tilesetpxh = ${config.tilesetPixelHeight};

export const bgtiles = ${JSON.stringify(bgtiles, null, 2)};
export const objmap = ${JSON.stringify(objmap, null, 2)};
export const collisionmap = ${JSON.stringify(collisionmap, null, 2)};
export const animatedsprites = [];

export const mapwidth = ${scene.width};
export const mapheight = ${scene.height};

export const originX = ${scene.originX};
export const originY = ${scene.originY};
export const zones = ${JSON.stringify(zones, null, 2)};
export const objects = ${JSON.stringify(objects, null, 2)};
export const markers = ${JSON.stringify(markers, null, 2)};
export const tileRegistry = ${JSON.stringify(tileRegistry, null, 2)};
`;
}

function writeGeneratedModule(outputModulePath, moduleSource) {
  fs.mkdirSync(path.dirname(outputModulePath), { recursive: true });
  fs.writeFileSync(outputModulePath, moduleSource, 'utf8');
}

function logSummary(sceneId, config, scene) {
  console.log(`[convertUnityScene] sceneId: ${sceneId}`);
  console.log(`[convertUnityScene] input json: ${config.inputJson}`);
  console.log(`[convertUnityScene] output module: ${config.outputModule}`);
  console.log(`[convertUnityScene] tileDim: ${scene.tileDim}`);
  console.log(`[convertUnityScene] size: ${scene.width} x ${scene.height}`);
  console.log(`[convertUnityScene] tileset path: ${config.tilesetPath}`);
  console.log(
    `[convertUnityScene] tileset px size: ${config.tilesetPixelWidth} x ${config.tilesetPixelHeight}`,
  );
  console.log(`[convertUnityScene] zones count: ${(scene.zones ?? []).length}`);
  console.log(`[convertUnityScene] objects count: ${(scene.objects ?? []).length}`);
  console.log(`[convertUnityScene] markers count: ${(scene.markers ?? []).length}`);
}

export function convertSceneById(sceneId) {
  const config = getMapConfig(sceneId);
  const inputJsonPath = path.resolve(projectRoot, config.inputJson);
  const outputModulePath = path.resolve(projectRoot, config.outputModule);
  const scene = readSceneJson(inputJsonPath);
  const moduleSource = buildGeneratedModule(scene, config);

  writeGeneratedModule(outputModulePath, moduleSource);
  logSummary(sceneId, config, scene);

  return {
    sceneId,
    inputJsonPath,
    outputModulePath,
  };
}

function runCli() {
  const sceneId = parseSceneId(process.argv.slice(2));
  convertSceneById(sceneId);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli();
}
