import { GMGuardResult, GMObservation, GMTurnOrderResult } from '../gmTypes';

// 所有 GM debug 记录都只服务于调试与审计，
// 不允许写入 agent memory，避免污染角色后续推理。
export interface GMDebugRecord {
  type: 'guard' | 'willingness' | 'spatial';
  timestamp: number;
}

// guard 记录聚焦“这句话为什么被放行、重生成或拦截”，
// 便于回看一次完整的 GM 判定链路。
export interface GMGuardDebugRecord extends GMDebugRecord {
  type: 'guard';
  agentId: string;
  conversationId?: string;
  eventId?: string;
  rawOutput: string;
  visibleFacts: string[];
  hiddenFactsMatched: string[];
  reasoningType: GMGuardResult['reasoningType'];
  interventionLevel: GMGuardResult['interventionLevel'];
  decision: GMGuardResult['decision'];
  result: GMGuardResult;
  regeneratedOutput?: string;
}

// willingness 记录聚焦“为什么轮到某个 agent 说话”，
// 主要给调试面板展示排序依据使用。
export interface GMWillingnessDebugRecord extends GMDebugRecord {
  type: 'willingness';
  conversationId: string;
  participants: string[];
  reasonForEachScore: Record<string, string>;
  result: GMTurnOrderResult;
}

// spatial 记录保留某个 agent 当时看到的语义化观察快照，
// 便于后续核对 perception 是否过度暴露了信息。
export interface GMSpatialDebugRecord extends GMDebugRecord {
  type: 'spatial';
  agentId: string;
  observation: GMObservation;
}
