import { Point } from '../util/types';
import { AgentDescription } from './agentDescription';
import { Agent } from './agent';
import { Game } from './game';
import { Player } from './player';
import { SceneAgentSeed } from './sceneTypes';

export function createSceneAgent(
  game: Game,
  now: number,
  description: SceneAgentSeed,
  spawnPosition?: Point,
) {
  const playerId = Player.join(
    game,
    now,
    description.name,
    description.character,
    description.publicProfile,
    undefined,
    spawnPosition,
  );
  const agentId = game.allocId('agents');
  game.world.agents.set(
    agentId,
    new Agent({
      id: agentId,
      playerId,
      inProgressOperation: undefined,
      lastConversation: undefined,
      lastInviteAttempt: undefined,
      lastInteractionDecision: undefined,
      toRemember: undefined,
    }),
  );
  game.agentDescriptions.set(
    agentId,
    new AgentDescription({
      agentId,
      roleId: description.roleId,
      publicProfile: description.publicProfile,
      identity: description.identity,
      plan: description.plan,
    }),
  );
  game.descriptionsModified = true;
  return { agentId, playerId };
}
