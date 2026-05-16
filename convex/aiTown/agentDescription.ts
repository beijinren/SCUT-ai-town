import { ObjectType, v } from 'convex/values';
import { GameId, agentId, parseGameId } from './ids';

export class AgentDescription {
  agentId: GameId<'agents'>;
  publicProfile: string;
  identity: string;
  plan: string;

  constructor(serialized: SerializedAgentDescription) {
    const { agentId, publicProfile, identity, plan } = serialized;
    this.agentId = parseGameId('agents', agentId);
    this.publicProfile = publicProfile;
    this.identity = identity;
    this.plan = plan;
  }

  serialize(): SerializedAgentDescription {
    const { agentId, publicProfile, identity, plan } = this;
    return { agentId, publicProfile, identity, plan };
  }
}

export const serializedAgentDescription = {
  agentId,
  publicProfile: v.string(),
  identity: v.string(),
  plan: v.string(),
};
export type SerializedAgentDescription = ObjectType<typeof serializedAgentDescription>;
