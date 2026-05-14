// Re-export willingness-related types from gmTypes so downstream code has a
// stable import path under convex/GM/willingness/.
export type {
  GMExternalWillingnessScore,
  GMWillingnessConflict,
  GMWillingnessContext,
  GMWillingnessExtensionRequest,
  GMWillingnessExtensionResult,
  GMWillingnessFactor,
  GMWillingnessScore,
  GMWillingnessTriggerReason,
  GMTurnOrderResult,
} from '../gmTypes';
