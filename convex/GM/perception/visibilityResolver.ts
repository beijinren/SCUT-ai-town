import { distance } from '../../util/geometry';
import { gmConfig } from '../gmConfig';
import { GMFact, GMRuntimeContext, GMSceneObject, GMVisibleFact } from '../gmTypes';
import { buildSemanticLocation } from '../spatial/spatialSemantics';

function canSeeFact(agentId: string, fact: GMFact) {
  // Visibility is intentionally policy-based so it can later be swapped for
  // a richer occlusion or graph-based rule set.
  switch (fact.visibility) {
    case 'public':
      return true;
    case 'private':
      return (fact.ownerAgentIds ?? []).includes(agentId) || (fact.knownBy ?? []).includes(agentId);
    case 'shared':
      return (
        (fact.sharedWithAgentIds ?? []).includes(agentId) ||
        (fact.ownerAgentIds ?? []).includes(agentId) ||
        (fact.knownBy ?? []).includes(agentId)
      );
    case 'hidden':
      return (fact.knownBy ?? []).includes(agentId);
    default:
      return false;
  }
}

export function resolveVisibleAgents(context: GMRuntimeContext, agentId: string) {
  const actor = context.actors.find((item) => item.agentId === agentId);
  if (!actor) {
    throw new Error(`Unknown agent ${agentId}`);
  }
  const selfLocation = buildSemanticLocation(context, agentId);
  return context.actors
    .filter((candidate) => candidate.agentId !== agentId)
    .filter((candidate) => {
      const candidateLocation = buildSemanticLocation(context, candidate.agentId);
      if (candidateLocation.roomId !== selfLocation.roomId) {
        return false;
      }
      return distance(actor.position, candidate.position) <= gmConfig.visibilityDistance;
    })
    .map((candidate) => candidate.agentId);
}

export function resolveVisibleObjects(context: GMRuntimeContext, agentId: string) {
  const actor = context.actors.find((item) => item.agentId === agentId);
  if (!actor) {
    throw new Error(`Unknown agent ${agentId}`);
  }
  const selfLocation = buildSemanticLocation(context, agentId);
  return context.objects.filter((object) => {
    if (object.roomId && object.roomId !== selfLocation.roomId) {
      return false;
    }
    if (!object.position) {
      return Boolean(object.roomId === selfLocation.roomId || object.zoneId === selfLocation.zoneId);
    }
    return distance(actor.position, object.position) <= gmConfig.visibilityDistance;
  });
}

export function resolveVisibleFacts(context: GMRuntimeContext, agentId: string): GMVisibleFact[] {
  return context.facts
    .filter((fact) => canSeeFact(agentId, fact))
    .map((fact) => ({
      factId: fact.id,
      title: fact.title,
      content: fact.content,
      visibility: fact.visibility,
      source: fact.source,
    }));
}

export function isObjectVisibleToAgent(context: GMRuntimeContext, agentId: string, object: GMSceneObject) {
  return resolveVisibleObjects(context, agentId).some((candidate) => candidate.id === object.id);
}
