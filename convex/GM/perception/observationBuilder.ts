import { gmConfig } from '../gmConfig';
import { GMMessage, GMObservation, GMRuntimeContext } from '../gmTypes';
import { buildSemanticLocation } from '../spatial/spatialSemantics';
import { resolveAudibleMessages } from './audibleResolver';
import { resolveVisibleAgents, resolveVisibleFacts, resolveVisibleObjects } from './visibilityResolver';

function formatRecentMessages(messages: GMMessage[]) {
  return messages
    .slice(-gmConfig.maxRecentMessagesInObservation)
    .map((message) => `${message.authorName}: ${message.text}`);
}

export function buildObservationText(context: GMRuntimeContext, agentId: string) {
  const semanticLocation = buildSemanticLocation(context, agentId);
  const visibleAgents = resolveVisibleAgents(context, agentId)
    .map((id) => context.actors.find((actor) => actor.agentId === id)?.name ?? id);
  const visibleObjects = resolveVisibleObjects(context, agentId).map((object) => object.name);
  const visibleFacts = resolveVisibleFacts(context, agentId)
    .slice(0, gmConfig.maxVisibleFactsInObservation)
    .map((fact) => `${fact.title}: ${fact.content}`);
  const audibleMessages = formatRecentMessages(resolveAudibleMessages(context, agentId));

  // Keep the observation compact because it is designed for prompt injection.
  const lines = [
    `You are in ${semanticLocation.roomName}.`,
    visibleAgents.length > 0
      ? `Visible agents: ${visibleAgents.join(', ')}.`
      : 'Visible agents: none.',
    visibleObjects.length > 0
      ? `Visible objects: ${visibleObjects.join(', ')}.`
      : 'Visible objects: none.',
    visibleFacts.length > 0
      ? `Visible facts: ${visibleFacts.join(' | ')}.`
      : 'Visible facts: none.',
    audibleMessages.length > 0
      ? `Recent audible messages: ${audibleMessages.join(' | ')}.`
      : 'Recent audible messages: none.',
  ];

  return lines.join('\n');
}

export function buildObservation(context: GMRuntimeContext, agentId: string): GMObservation {
  return {
    agentId,
    semanticLocation: buildSemanticLocation(context, agentId),
    visibleAgents: resolveVisibleAgents(context, agentId),
    visibleObjects: resolveVisibleObjects(context, agentId),
    visibleFacts: resolveVisibleFacts(context, agentId),
    audibleMessages: resolveAudibleMessages(context, agentId),
    text: buildObservationText(context, agentId),
  };
}
