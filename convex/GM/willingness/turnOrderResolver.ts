import {
  GMExternalWillingnessScore,
  GMWillingnessContext,
  GMWillingnessExtensionRequest,
  GMWillingnessScore,
  GMTurnOrderResult,
  GMWillingnessTriggerReason,
} from '../gmTypes';

function sortScores(scores: GMWillingnessScore[]) {
  return [...scores]
    .filter((score) => score.canSpeak)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      // Keep the built-in tie-breaker simple and deterministic.
      // GM should intervene only when the caller explicitly wants extra review.
      const leftDirect = left.factors.some((factor) => factor.label === 'direct_question') ? 1 : 0;
      const rightDirect = right.factors.some((factor) => factor.label === 'direct_question') ? 1 : 0;
      if (rightDirect !== leftDirect) {
        return rightDirect - leftDirect;
      }
      return left.agentId.localeCompare(right.agentId);
    });
}

export function normalizeExternalWillingnessScores(
  scores: GMExternalWillingnessScore[],
): GMWillingnessScore[] {
  return scores.map((score) => ({
    agentId: score.agentId,
    score: score.score,
    factors: score.factors ?? [],
    reason: score.reason ?? 'Provided by external willingness scorer.',
    canSpeak: score.canSpeak ?? true,
  }));
}

export function detectTurnOrderConflict(
  ranking: GMWillingnessScore[],
): GMTurnOrderResult['conflict'] | undefined {
  if (ranking.length < 2) {
    return undefined;
  }

  const topScore = ranking[0]?.score;
  const tiedTopAgents = ranking.filter((score) => score.score === topScore).map((score) => score.agentId);
  if (tiedTopAgents.length > 1) {
    return {
      type: 'score_tie',
      agentIds: tiedTopAgents,
      reason: 'Multiple agents share the highest willingness score.',
    };
  }

  return undefined;
}

export function resolveTurnOrder(
  scores: GMWillingnessScore[],
  triggerReason: GMWillingnessTriggerReason,
  options?: {
    usedExternalScores?: boolean;
  },
): GMTurnOrderResult {
  const ranking = sortScores(scores);
  const conflict = detectTurnOrderConflict(ranking);
  return {
    ranking,
    selectedNextSpeaker: ranking[0]?.agentId,
    triggerReason,
    usedExternalScores: options?.usedExternalScores ?? false,
    needsGMReview: Boolean(conflict),
    conflict,
  };
}

export function resolveTurnOrderFromExternalScores(
  scores: GMExternalWillingnessScore[],
  triggerReason: GMWillingnessTriggerReason,
): GMTurnOrderResult {
  return resolveTurnOrder(normalizeExternalWillingnessScores(scores), triggerReason, {
    usedExternalScores: true,
  });
}

/**
 * This is only an extension hook payload.
 * The caller may choose to hand this to a future GM-specific tie-break model.
 */
export function buildGMWillingnessExtensionRequest(args: {
  conversationId: string;
  triggerReason: GMWillingnessTriggerReason;
  ranking: GMWillingnessScore[];
}) {
  const conflict = detectTurnOrderConflict(args.ranking);
  if (!conflict) {
    return null;
  }
  const request: GMWillingnessExtensionRequest = {
    conversationId: args.conversationId,
    triggerReason: args.triggerReason,
    ranking: args.ranking,
    conflict,
  };
  return request;
}

/**
 * Backward-compatible helper for older callers that still build scores locally.
 */
export function selectNextSpeaker(scores: GMWillingnessScore[]) {
  return resolveTurnOrder(scores, 'manual_refresh').selectedNextSpeaker;
}

/**
 * Convenience helper: only resolve external willingness when a trigger exists.
 */
export function maybeResolveExternalTurnOrder(args: {
  context: GMWillingnessContext;
  triggerReason: GMWillingnessTriggerReason | null;
  scores: GMExternalWillingnessScore[];
}) {
  if (!args.triggerReason) {
    return null;
  }
  return resolveTurnOrderFromExternalScores(args.scores, args.triggerReason);
}
