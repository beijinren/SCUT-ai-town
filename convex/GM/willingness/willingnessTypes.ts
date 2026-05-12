// willingness 相关类型统一从 gmTypes 转发，避免在多个文件重复维护。
export type {
  GMWillingnessContext,
  GMWillingnessFactor,
  GMWillingnessScore,
  GMWillingnessTriggerReason,
  GMTurnOrderResult,
} from '../gmTypes';
