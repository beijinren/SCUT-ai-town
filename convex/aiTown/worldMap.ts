import { Infer, ObjectType, v } from 'convex/values';

// `layer[position.x][position.y]` is the tileIndex or -1 if empty.
const tileLayer = v.array(v.array(v.number()));
export type TileLayer = Infer<typeof tileLayer>;

const semanticBounds = {
  minX: v.number(),
  minY: v.number(),
  maxX: v.number(),
  maxY: v.number(),
};
export type SemanticBounds = ObjectType<typeof semanticBounds>;

const animatedSprite = {
  x: v.number(),
  y: v.number(),
  w: v.number(),
  h: v.number(),
  layer: v.number(),
  sheet: v.string(),
  animation: v.string(),
};
export type AnimatedSprite = ObjectType<typeof animatedSprite>;

const semanticZone = {
  id: v.string(),
  name: v.string(),
  roomId: v.string(),
  minX: v.optional(v.number()),
  minY: v.optional(v.number()),
  maxX: v.optional(v.number()),
  maxY: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
  socialMeaning: v.optional(v.string()),
  unityBounds: v.optional(v.object(semanticBounds)),
  bounds: v.optional(v.object(semanticBounds)),
};
export type SemanticZone = ObjectType<typeof semanticZone>;

const semanticObject = {
  id: v.string(),
  name: v.string(),
  kind: v.optional(v.string()),
  x: v.number(),
  y: v.number(),
  roomId: v.optional(v.string()),
  zoneId: v.optional(v.string()),
  parentObjectId: v.optional(v.string()),
  interactive: v.optional(v.boolean()),
  blocking: v.optional(v.boolean()),
  tags: v.optional(v.array(v.string())),
  affordances: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
  unityX: v.optional(v.number()),
  unityY: v.optional(v.number()),
};
export type SemanticObject = ObjectType<typeof semanticObject>;

const semanticMarker = {
  id: v.string(),
  type: v.string(),
  x: v.number(),
  y: v.number(),
  role: v.optional(v.string()),
  targetObjectId: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
  unityX: v.optional(v.number()),
  unityY: v.optional(v.number()),
};
export type SemanticMarker = ObjectType<typeof semanticMarker>;

const tileRegistryItem = {
  index: v.number(),
  tileName: v.string(),
};
export type TileRegistryItem = ObjectType<typeof tileRegistryItem>;

const runtimeTuning = {
  playerRenderScale: v.optional(v.number()),
  defaultZoomMultiplier: v.optional(v.number()),
  minZoomMultiplier: v.optional(v.number()),
  maxZoomMultiplier: v.optional(v.number()),
  playerCollisionThreshold: v.optional(v.number()),
  conversationDistance: v.optional(v.number()),
};
export type RuntimeTuning = ObjectType<typeof runtimeTuning>;

export const serializedWorldMap = {
  width: v.number(),
  height: v.number(),

  tileSetUrl: v.string(),
  //  Width & height of tileset image, px.
  tileSetDimX: v.number(),
  tileSetDimY: v.number(),

  // Tile size in pixels (assume square)
  tileDim: v.number(),
  bgTiles: v.array(v.array(v.array(v.number()))),
  objectTiles: v.array(tileLayer),
  collisionTiles: v.optional(v.array(tileLayer)),
  animatedSprites: v.array(v.object(animatedSprite)),
  sceneId: v.optional(v.string()),
  sceneName: v.optional(v.string()),
  originX: v.optional(v.number()),
  originY: v.optional(v.number()),
  zones: v.optional(v.array(v.object(semanticZone))),
  objects: v.optional(v.array(v.object(semanticObject))),
  semanticAreas: v.optional(v.array(v.object(semanticZone))),
  semanticObjects: v.optional(v.array(v.object(semanticObject))),
  markers: v.optional(v.array(v.object(semanticMarker))),
  tileRegistry: v.optional(v.array(v.object(tileRegistryItem))),
  runtimeTuning: v.optional(v.object(runtimeTuning)),
};
export type SerializedWorldMap = ObjectType<typeof serializedWorldMap>;

export class WorldMap {
  width: number;
  height: number;

  tileSetUrl: string;
  tileSetDimX: number;
  tileSetDimY: number;

  tileDim: number;

  bgTiles: TileLayer[];
  objectTiles: TileLayer[];
  collisionTiles: TileLayer[];
  animatedSprites: AnimatedSprite[];
  sceneId?: string;
  sceneName?: string;
  originX?: number;
  originY?: number;
  zones: SemanticZone[];
  objects: SemanticObject[];
  markers: SemanticMarker[];
  tileRegistry: TileRegistryItem[];
  runtimeTuning: RuntimeTuning;

  constructor(serialized: SerializedWorldMap) {
    this.width = serialized.width;
    this.height = serialized.height;
    this.tileSetUrl = serialized.tileSetUrl;
    this.tileSetDimX = serialized.tileSetDimX;
    this.tileSetDimY = serialized.tileSetDimY;
    this.tileDim = serialized.tileDim;
    this.bgTiles = serialized.bgTiles;
    this.objectTiles = serialized.objectTiles;
    this.collisionTiles = serialized.collisionTiles ?? serialized.objectTiles;
    this.animatedSprites = serialized.animatedSprites;
    this.sceneId = serialized.sceneId;
    this.sceneName = serialized.sceneName;
    this.originX = serialized.originX;
    this.originY = serialized.originY;
    this.zones = serialized.zones ?? serialized.semanticAreas ?? [];
    this.objects = serialized.objects ?? serialized.semanticObjects ?? [];
    this.markers = serialized.markers ?? [];
    this.tileRegistry = serialized.tileRegistry ?? [];
    this.runtimeTuning = serialized.runtimeTuning ?? {};
  }

  serialize(): SerializedWorldMap {
    return {
      width: this.width,
      height: this.height,
      tileSetUrl: this.tileSetUrl,
      tileSetDimX: this.tileSetDimX,
      tileSetDimY: this.tileSetDimY,
      tileDim: this.tileDim,
      bgTiles: this.bgTiles,
      objectTiles: this.objectTiles,
      collisionTiles: this.collisionTiles,
      animatedSprites: this.animatedSprites,
      sceneId: this.sceneId,
      sceneName: this.sceneName,
      originX: this.originX,
      originY: this.originY,
      zones: this.zones,
      objects: this.objects,
      semanticAreas: this.zones,
      semanticObjects: this.objects,
      markers: this.markers,
      tileRegistry: this.tileRegistry,
      runtimeTuning: this.runtimeTuning,
    };
  }

  getZoneAt(position: { x: number; y: number }) {
    return this.zones.find(
      (zone) =>
        zone.bounds &&
        position.x >= zone.bounds.minX &&
        position.x <= zone.bounds.maxX &&
        position.y >= zone.bounds.minY &&
        position.y <= zone.bounds.maxY,
    );
  }

  getNearbyObjects(position: { x: number; y: number }, maxDistance = 2.5) {
    return this.objects.filter((object) => {
      const dx = object.x - position.x;
      const dy = object.y - position.y;
      return Math.hypot(dx, dy) <= maxDistance;
    });
  }

  getSpawnMarkers(role?: string) {
    return this.markers.filter(
      (marker) => marker.type === 'Spawn' && (!role || marker.role === role),
    );
  }

  getFocusPointForObject(objectId: string) {
    return this.markers.find(
      (marker) => marker.type === 'FocusPoint' && marker.targetObjectId === objectId,
    );
  }

  get semanticAreas() {
    return this.zones;
  }

  get semanticObjects() {
    return this.objects;
  }
}
