import { GMTurnOrderResult, GMWillingnessTriggerReason } from '../gmTypes';
import { GMWillingnessDebugRecord } from '../debug/debugTypes';

export function buildWillingnessDebugRecord(
  conversationId: string,
  triggerReason: GMWillingnessTriggerReason,
  result: GMTurnOrderResult,
): GMWillingnessDebugRecord {
  // 明确保留每个人的 reason，方便调试面板解释“为什么轮到他”。
  return {
    type: 'willingness',
    timestamp: Date.now(),
    conversationId,
    participants: result.ranking.map((score) => score.agentId),
    reasonForEachScore: Object.fromEntries(
      result.ranking.map((score) => [score.agentId, score.reason]),
    ),
    result: {
      ...result,
      triggerReason,
    },
  };
}
