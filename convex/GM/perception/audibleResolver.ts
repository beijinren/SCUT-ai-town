import { distance } from '../../util/geometry';
import { gmConfig } from '../gmConfig';
import { GMMessage, GMRuntimeContext } from '../gmTypes';
import { buildSemanticLocation } from '../spatial/spatialSemantics';

function conversationHasAgent(context: GMRuntimeContext, conversationId: string | undefined, agentId: string) {
  if (!conversationId || !context.conversations) {
    return false;
  }
  return context.conversations.some(
    (conversation) =>
      conversation.conversationId === conversationId &&
      conversation.participantAgentIds.includes(agentId),
  );
}

export function canHearMessage(context: GMRuntimeContext, listenerAgentId: string, message: GMMessage) {
  // Conversation membership wins over room acoustics because it models the
  // explicit "you are part of this exchange" contract.
  if (message.authorAgentId === listenerAgentId) {
    return true;
  }
  if (conversationHasAgent(context, message.conversationId, listenerAgentId)) {
    return true;
  }
  if (message.delivery === 'whisper') {
    return message.targetAgentId === listenerAgentId;
  }
  const listener = context.actors.find((item) => item.agentId === listenerAgentId);
  const author = message.authorAgentId
    ? context.actors.find((item) => item.agentId === message.authorAgentId)
    : undefined;
  if (!listener || !author) {
    return false;
  }
  const listenerLocation = buildSemanticLocation(context, listenerAgentId);
  const authorLocation = buildSemanticLocation(context, author.agentId);
  if (listenerLocation.roomId !== authorLocation.roomId) {
    return false;
  }
  return distance(listener.position, author.position) <= gmConfig.hearingDistance;
}

export function resolveAudibleMessages(context: GMRuntimeContext, listenerAgentId: string) {
  return context.messages.filter((message) => canHearMessage(context, listenerAgentId, message));
}
