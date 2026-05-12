import { GMRuntimeContext } from '../gmTypes';
import { buildObservation } from './observationBuilder';

export function buildPerceptionForAgent(context: GMRuntimeContext, agentId: string) {
  return buildObservation(context, agentId);
}

export function buildPerceptionsForConversation(
  context: GMRuntimeContext,
  participantAgentIds: string[],
) {
  return participantAgentIds.map((agentId) => buildPerceptionForAgent(context, agentId));
}
