import { Infer, ObjectType, v } from 'convex/values';

// `layer[position.x][position.y]` is the tileIndex or -1 if empty.
const tileLayer = v.array(v.array(v.number()));
export type TileLayer = Infer<typeof tileLayer>;

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

const semanticPoint = {
  x: v.number(),
  y: v.number(),
};

const semanticObject = {
  id: v.string(),
  sceneId: v.string(),
  type: v.string(),
  name: v.string(),
  position: v.object(semanticPoint),
  footprint: v.array(v.object(semanticPoint)),
  blocking: v.boolean(),
  interactable: v.boolean(),
  affordances: v.array(v.string()),
  tags: v.array(v.string()),
  description: v.string(),
};
export type SemanticObject = ObjectType<typeof semanticObject>;

const semanticArea = {
  id: v.string(),
  sceneId: v.string(),
  type: v.string(),
  name: v.string(),
  bounds: v.object({
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
  }),
  tags: v.array(v.string()),
  socialMeaning: v.string(),
};
export type SemanticArea = ObjectType<typeof semanticArea>;

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
  animatedSprites: v.array(v.object(animatedSprite)),
  semanticObjects: v.optional(v.array(v.object(semanticObject))),
  semanticAreas: v.optional(v.array(v.object(semanticArea))),
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
  animatedSprites: AnimatedSprite[];
  semanticObjects: SemanticObject[];
  semanticAreas: SemanticArea[];

  constructor(serialized: SerializedWorldMap) {
    this.width = serialized.width;
    this.height = serialized.height;
    this.tileSetUrl = serialized.tileSetUrl;
    this.tileSetDimX = serialized.tileSetDimX;
    this.tileSetDimY = serialized.tileSetDimY;
    this.tileDim = serialized.tileDim;
    this.bgTiles = serialized.bgTiles;
    this.objectTiles = serialized.objectTiles;
    this.animatedSprites = serialized.animatedSprites;
    this.semanticObjects = serialized.semanticObjects ?? [];
    this.semanticAreas = serialized.semanticAreas ?? [];
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
      animatedSprites: this.animatedSprites,
      semanticObjects: this.semanticObjects,
      semanticAreas: this.semanticAreas,
    };
  }
}
