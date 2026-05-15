import interviewRoomConfig from './interview_room.json';
import type { SemanticArea, SemanticObject } from '../../../convex/aiTown/worldMap';

type TileRow = {
  tiles: number[];
};

type TileLayer = {
  id: string;
  rows: TileRow[];
};

type RawZone = {
  id: string;
  name: string;
  type?: string;
  roomId?: string;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  tags?: string[];
  socialMeaning?: string;
};

type RawObject = {
  id: string;
  sceneId?: string;
  roomId?: string;
  zoneId?: string;
  parentObjectId?: string;
  type?: string;
  kind?: string;
  name: string;
  x: number;
  y: number;
  footprint?: Array<{ x: number; y: number }>;
  blocking?: boolean;
  interactive?: boolean;
  interactable?: boolean;
  affordances?: string[];
  tags?: string[];
  description?: string;
};

type RawInterviewRoomConfig = {
  sceneId: string;
  tileDim: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  bgLayers?: TileLayer[];
  collisionLayers?: TileLayer[];
  visualLayers?: TileLayer[];
  zones?: RawZone[];
  objects?: RawObject[];
};

const config = interviewRoomConfig as RawInterviewRoomConfig;

export const tilesetpath = '/maps/interview_room/tileset.png';
export const tiledim = config.tileDim;
export const screenxtiles = config.width;
export const screenytiles = config.height;
export const mapwidth = config.width;
export const mapheight = config.height;
export const tilesetpxw = 384;
export const tilesetpxh = 416;
export const animatedsprites: never[] = [];

function toMapX(worldX: number) {
  return worldX - config.originX;
}

function toMapY(worldY: number) {
  return worldY - config.originY;
}

function toMapPoint(point: { x: number; y: number }) {
  return {
    x: toMapX(point.x),
    y: toMapY(point.y),
  };
}

function buildLayer(layer: TileLayer) {
  // AI Town 的老地图格式是 layer[x][y]，而导出的 JSON 是 rows[y].tiles[x]。
  // 这里统一转一次，后续 movement / render 仍然照旧读取，不需要知道原始 JSON 长什么样。
  return Array.from({ length: config.width }, (_unused, x) =>
    Array.from({ length: config.height }, (_unusedY, y) => layer.rows[y]?.tiles[x] ?? -1),
  );
}

const backgroundLayers = (config.bgLayers ?? []).map(buildLayer);
const visualLayers = (config.visualLayers ?? []).map(buildLayer);

// bgTiles 只负责显示，不参与阻挡判断；所以把视觉层也放在这里，避免角色被装饰层误挡住。
export const bgtiles = [...backgroundLayers, ...visualLayers];

// objectTiles 仍然只放碰撞层，movement 会继续用它判断哪里不能走。
export const objmap = (config.collisionLayers ?? []).map(buildLayer);

export const semanticAreas: SemanticArea[] = (config.zones ?? []).map((zone) => ({
  id: zone.id,
  sceneId: config.sceneId,
  type: zone.type ?? zone.roomId ?? 'area',
  name: zone.name,
  bounds: {
    x: toMapX(zone.bounds?.minX ?? zone.minX ?? 0),
    y: toMapY(zone.bounds?.minY ?? zone.minY ?? 0),
    width: (zone.bounds?.maxX ?? zone.maxX ?? 0) - (zone.bounds?.minX ?? zone.minX ?? 0) + 1,
    height: (zone.bounds?.maxY ?? zone.maxY ?? 0) - (zone.bounds?.minY ?? zone.minY ?? 0) + 1,
  },
  tags: zone.tags ?? [],
  socialMeaning: zone.socialMeaning ?? '',
}));

export const semanticObjects: SemanticObject[] = (config.objects ?? []).map((object) => {
  const position = toMapPoint({ x: object.x, y: object.y });
  const footprint =
    object.footprint && object.footprint.length > 0
      ? object.footprint.map(toMapPoint)
      : [position];

  return {
    id: object.id,
    sceneId: object.sceneId ?? config.sceneId,
    type: object.type ?? object.kind ?? 'object',
    name: object.name,
    position,
    footprint,
    blocking: object.blocking ?? false,
    interactable: object.interactable ?? object.interactive ?? false,
    affordances: object.affordances ?? [],
    tags: object.tags ?? [],
    description: object.description ?? '',
  };
});
