import { GMWillingnessScore, GMTurnOrderResult, GMWillingnessTriggerReason } from '../gmTypes';

export function resolveTurnOrder(
  scores: GMWillingnessScore[],
  triggerReason: GMWillingnessTriggerReason,
): GMTurnOrderResult {
  const ranking = [...scores]
    .filter((score) => score.canSpeak)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      // 同分时优先直接被问到的人，再用稳定排序兜底，确保结果可解释。
      const leftDirect = left.factors.some((factor) => factor.label === 'direct_question') ? 1 : 0;
      const rightDirect = right.factors.some((factor) => factor.label === 'direct_question') ? 1 : 0;
      if (rightDirect !== leftDirect) {
        return rightDirect - leftDirect;
      }
      return left.agentId.localeCompare(right.agentId);
    });
  return {
    ranking,
    selectedNextSpeaker: ranking[0]?.agentId,
    triggerReason,
  };
}

export function selectNextSpeaker(scores: GMWillingnessScore[]) {
  return resolveTurnOrder(scores, 'manual_refresh').selectedNextSpeaker;
}
