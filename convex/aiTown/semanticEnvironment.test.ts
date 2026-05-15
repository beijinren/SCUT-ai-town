import { getEnvironmentContextForPlayer, buildInteractionCandidates } from './semanticEnvironment';
import { SerializedPlayer } from './player';
import { WorldMap } from './worldMap';

function makeLayer(width: number, height: number) {
  return Array.from({ length: width }, () => Array.from({ length: height }, () => -1));
}

function makeMap() {
  return new WorldMap({
    width: 20,
    height: 20,
    tileSetUrl: '',
    tileSetDimX: 0,
    tileSetDimY: 0,
    tileDim: 1,
    bgTiles: [makeLayer(20, 20)],
    objectTiles: [makeLayer(20, 20)],
    animatedSprites: [],
    semanticAreas: [
      {
        id: 'lounge_area',
        sceneId: 'scene',
        type: 'lounge',
        name: '休息区',
        bounds: { x: 0, y: 0, width: 10, height: 10 },
        tags: ['低压力', '适合闲聊'],
        socialMeaning: '适合低压力交流。',
      },
    ],
    semanticObjects: [
      {
        id: 'drink_table',
        sceneId: 'scene',
        type: 'table',
        name: '饮料桌',
        position: { x: 4, y: 4 },
        footprint: [{ x: 4, y: 4 }],
        blocking: true,
        interactable: true,
        affordances: ['casual_chat', 'wait'],
        tags: ['低压力', '适合闲聊'],
        description: '适合自然开场。',
      },
    ],
  });
}

function makePlayer(overrides: Partial<SerializedPlayer>): SerializedPlayer {
  return {
    id: 'p:self',
    lastInput: Date.now(),
    position: { x: 3, y: 4 },
    facing: { dx: 1, dy: 0 },
    speed: 0,
    ...overrides,
  };
}

describe('semantic environment', () => {
  it('识别当前区域、附近物品和附近人物', () => {
    const player = makePlayer({ id: 'p:self', position: { x: 3, y: 4 } });
    const other = makePlayer({ id: 'p:other', position: { x: 5, y: 4 } });
    const context = getEnvironmentContextForPlayer(player, makeMap(), {
      players: [
        { player, isInConversation: false },
        { player: other, isInConversation: false },
      ],
    });

    expect(context.currentArea?.name).toBe('休息区');
    expect(context.nearbyObjects.map((object) => object.id)).toContain('drink_table');
    expect(context.nearbyPeople.map((person) => person.playerId)).toContain('p:other');
    expect(context.environmentHints.join('\n')).toContain('饮料桌');
  });

  it('生成 move_to_object 候选，并避开 blocking 物品自身格子', () => {
    const player = makePlayer({ id: 'p:self', position: { x: 3, y: 4 } });
    const context = getEnvironmentContextForPlayer(player, makeMap(), {
      players: [{ player, isInConversation: false }],
    });
    const candidates = buildInteractionCandidates({
      player,
      environmentContext: context,
      worldMap: makeMap(),
      otherFreePlayers: [],
      occupiedPositions: [],
    });
    const moveToObject = candidates.find((candidate) => candidate.kind === 'move_to_object');

    expect(moveToObject?.kind).toBe('move_to_object');
    if (moveToObject?.kind === 'move_to_object') {
      expect(moveToObject.destination).not.toEqual({ x: 4, y: 4 });
      expect(moveToObject.score).toBeGreaterThan(2.5);
    }
  });
});
