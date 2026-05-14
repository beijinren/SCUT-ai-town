import {
  getGuardDebugRecords,
  getLeakageDebugRecords,
  getSpatialDebugRecords,
  getWillingnessDebugRecords,
} from './debugLog';

export function getLatestGuardDecision(agentId?: string) {
  const records = getGuardDebugRecords().filter((record) => (agentId ? record.agentId === agentId : true));
  return records.at(-1) ?? null;
}

export function getLatestSpatialObservation(agentId?: string) {
  const records = getSpatialDebugRecords().filter((record) => (agentId ? record.agentId === agentId : true));
  return records.at(-1) ?? null;
}

export function getLatestLeakage(agentId?: string) {
  const records = getLeakageDebugRecords().filter((record) => (agentId ? record.agentId === agentId : true));
  return records.at(-1) ?? null;
}

export function getAgentVisibleInfo(agentId: string) {
  return getLatestSpatialObservation(agentId)?.observation ?? null;
}

export function getConversationWillingnessRanking(conversationId: string) {
  return getLatestWillingness(conversationId)?.result.ranking ?? [];
}

export function getFactPropagationPath(factId: string) {
  const records = getGuardDebugRecords().filter((record) => record.hiddenFactsMatched.includes(factId));
  return records.map((record) => ({
    agentId: record.agentId,
    conversationId: record.conversationId,
    timestamp: record.timestamp,
    decision: record.decision,
  }));
}

export function getLatestWillingness(conversationId?: string) {
  const records = getWillingnessDebugRecords().filter((record) =>
    conversationId ? record.conversationId === conversationId : true,
  );
  return records.at(-1) ?? null;
}
