import { ObjectType, v } from 'convex/values';
import { Conversation, serializedConversation } from './conversation';
import { Player, serializedPlayer } from './player';
import { Agent, serializedAgent } from './agent';
import { GameId, parseGameId, playerId } from './ids';
import { parseMap } from '../util/object';
import { SceneWorldSeed } from './sceneTypes';

export const historicalLocations = v.array(
  v.object({
    playerId,
    location: v.bytes(),
  }),
);

export const serializedSceneWorldSeed = {
  sceneId: v.string(),
  sceneType: v.string(),
  title: v.string(),
  publicSummary: v.string(),
  location: v.string(),
  tone: v.string(),
  currentPhase: v.string(),
  pressureSource: v.array(v.string()),
  roleIds: v.array(v.string()),
  roleNames: v.array(v.string()),
  publicFactIds: v.array(v.string()),
  hiddenFactIds: v.array(v.string()),
};

export const serializedWorld = {
  nextId: v.number(),
  conversations: v.array(v.object(serializedConversation)),
  players: v.array(v.object(serializedPlayer)),
  agents: v.array(v.object(serializedAgent)),
  historicalLocations: v.optional(historicalLocations),
  sceneState: v.optional(v.object(serializedSceneWorldSeed)),
};
export type SerializedWorld = ObjectType<typeof serializedWorld>;

export class World {
  nextId: number;
  conversations: Map<GameId<'conversations'>, Conversation>;
  players: Map<GameId<'players'>, Player>;
  agents: Map<GameId<'agents'>, Agent>;
  historicalLocations?: Map<GameId<'players'>, ArrayBuffer>;
  sceneState?: SceneWorldSeed;

  constructor(serialized: SerializedWorld) {
    const { nextId, historicalLocations, sceneState } = serialized;

    this.nextId = nextId;
    this.conversations = parseMap(serialized.conversations, Conversation, (c) => c.id);
    this.players = parseMap(serialized.players, Player, (p) => p.id);
    this.agents = parseMap(serialized.agents, Agent, (a) => a.id);
    this.sceneState = sceneState;

    if (historicalLocations) {
      this.historicalLocations = new Map();
      for (const { playerId, location } of historicalLocations) {
        this.historicalLocations.set(parseGameId('players', playerId), location);
      }
    }
  }

  playerConversation(player: Player): Conversation | undefined {
    return [...this.conversations.values()].find((c) => c.participants.has(player.id));
  }

  serialize(): SerializedWorld {
    return {
      nextId: this.nextId,
      conversations: [...this.conversations.values()].map((c) => c.serialize()),
      players: [...this.players.values()].map((p) => p.serialize()),
      agents: [...this.agents.values()].map((a) => a.serialize()),
      sceneState: this.sceneState,
      historicalLocations:
        this.historicalLocations &&
        [...this.historicalLocations.entries()].map(([playerId, location]) => ({
          playerId,
          location,
        })),
    };
  }
}
