import { GMFact, GMGuardContext, GMGuardResult } from '../gmTypes';
import { judgeInference } from './inferenceJudge';
import { detectLeakage } from './leakageDetector';

function buildMemorySupportedFactIds(context: GMGuardContext) {
  const fromMemoryRows = context.memoryEvidence?.flatMap((row) => (row.factId ? [row.factId] : [])) ?? [];
  const fromFacts = context.allFacts
    .filter((fact) => (fact.memoryEvidenceAgentIds ?? []).includes(context.actor.agentId))
    .map((fact) => fact.id);
  return [...new Set([...fromMemoryRows, ...fromFacts])];
}

function detectPhysicalImpossibleStatement(agentId: string, output: string, context: GMGuardContext) {
  const normalized = output.toLowerCase();
  const physicallyAbsentAgents = (context.physicallyPresentAgentIds ?? []).filter((id) => id !== agentId);
  const audibleAbsentAgents = (context.audibleAgentIds ?? []).filter((id) => id !== agentId);
  if (normalized.includes('i can see') && physicallyAbsentAgents.length === 0 && context.visibleFacts.length === 0) {
    return 'Output claims direct visual certainty without visible support in the current observation.';
  }
  if (normalized.includes('i heard') && audibleAbsentAgents.length === 0 && context.recentMessages.length === 0) {
    return 'Output claims audible evidence without audible support in the current observation.';
  }
  return null;
}

export function judgeOutput(agentId: string, output: string, context: GMGuardContext): GMGuardResult {
  // The guard follows a strict escalation order:
  // 1) impossible perception claims
  // 2) explicit hidden/private fact leakage
  // 3) otherwise allow or downgrade to Level 0 inference
  const knownFactIds = context.knownFacts.map((fact) => fact.id);
  const memorySupportedFactIds = buildMemorySupportedFactIds(context);
  const restrictedFacts: GMFact[] = context.allFacts
    .filter((fact) => fact.visibility === 'hidden' || fact.visibility === 'private')
    .filter((fact) => !knownFactIds.includes(fact.id));
  const hiddenFacts = restrictedFacts.length > 0 ? restrictedFacts : [];

  const physicalReason = detectPhysicalImpossibleStatement(agentId, output, context);
  if (physicalReason) {
    return {
      decision: 'physical_impossible',
      interventionLevel: 3,
      reason: physicalReason,
      matchedFactIds: [],
      visibleFactIds: context.visibleFacts.map((fact) => fact.factId),
      reasoningType: 'physical',
      hasKnownPath: false,
      hasMemoryEvidence: false,
      suggestions: ['Reject write', 'Mark impossible perception for debug review'],
    };
  }

  const leakage = detectLeakage(output, hiddenFacts, knownFactIds, memorySupportedFactIds);
  if (leakage.decision === 'clear_leakage') {
    return {
      decision: 'clear_leakage',
      interventionLevel: 3,
      reason: leakage.reason,
      matchedFactIds: leakage.matchedFactIds,
      visibleFactIds: context.visibleFacts.map((fact) => fact.factId),
      reasoningType: 'leakage',
      hasKnownPath: false,
      hasMemoryEvidence: leakage.matchedFactIds.some((factId) => memorySupportedFactIds.includes(factId)),
      suggestions: ['Block write', 'Skip memory write', 'Request regeneration'],
    };
  }
  if (leakage.decision === 'possible_leakage') {
    return {
      decision: 'possible_leakage',
      interventionLevel: 1,
      reason: leakage.reason,
      matchedFactIds: leakage.matchedFactIds,
      visibleFactIds: context.visibleFacts.map((fact) => fact.factId),
      reasoningType: 'leakage',
      hasKnownPath: leakage.matchedFactIds.some((factId) => knownFactIds.includes(factId)),
      hasMemoryEvidence: leakage.matchedFactIds.some((factId) => memorySupportedFactIds.includes(factId)),
      suggestions: ['Request regeneration with visible context only'],
    };
  }

  const inference = judgeInference(output, context.actor, hiddenFacts, context.knownFacts);
  const reasoningType =
    inference.decision === 'reasonable_inference'
      ? 'inference'
      : inference.decision === 'personality_based_guess'
        ? 'personality'
        : 'unsupported';
  return {
    decision: inference.decision,
    // Reasonable suspicion and personality-shaped guesses must remain Level 0.
    interventionLevel: 0,
    reason: inference.reason,
    matchedFactIds: [],
    visibleFactIds: context.visibleFacts.map((fact) => fact.factId),
    reasoningType,
    hasKnownPath: true,
    hasMemoryEvidence: memorySupportedFactIds.length > 0,
  };
}
