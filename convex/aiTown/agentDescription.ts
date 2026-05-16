import { ObjectType, v } from 'convex/values';
import { GameId, agentId, parseGameId } from './ids';

export class AgentDescription {
  agentId: GameId<'agents'>;
  roleId?: string;
  publicProfile: string;
  identity: string;
  plan: string;

  constructor(serialized: SerializedAgentDescription) {
    const { agentId, roleId, publicProfile, identity, plan } = serialized;
    this.agentId = parseGameId('agents', agentId);
    this.roleId = roleId;
    this.publicProfile = publicProfile;
    this.identity = identity;
    this.plan = plan;
  }

  serialize(): SerializedAgentDescription {
    const { agentId, roleId, publicProfile, identity, plan } = this;
    return { agentId, roleId, publicProfile, identity, plan };
  }
}

export const serializedAgentDescription = {
  agentId,
  roleId: v.optional(v.string()),
  publicProfile: v.string(),
  identity: v.string(),
  plan: v.string(),
};
export type SerializedAgentDescription = ObjectType<typeof serializedAgentDescription>;
