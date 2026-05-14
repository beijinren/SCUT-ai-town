import { GMGuardResult, GMRollbackPlan } from '../gmTypes';

export function buildRollbackPlan(result: GMGuardResult): GMRollbackPlan {
  // The rollback planner returns intent only. Bridge code can decide how and
  // when to apply the plan without embedding policy into persistence logic.
  if (result.decision === 'clear_leakage') {
    return {
      shouldRemoveMessage: true,
      shouldSkipMemoryWrite: true,
      shouldMarkViolation: true,
      shouldWriteMessage: false,
      shouldWriteMemory: false,
      shouldUpdateWorld: false,
      shouldWriteDebug: true,
      reason: result.reason,
    };
  }
  if (result.decision === 'possible_leakage' || result.decision === 'physical_impossible') {
    return {
      shouldRemoveMessage: true,
      shouldSkipMemoryWrite: true,
      shouldMarkViolation: result.decision === 'physical_impossible',
      shouldWriteMessage: false,
      shouldWriteMemory: false,
      shouldUpdateWorld: result.decision !== 'physical_impossible',
      shouldWriteDebug: true,
      reason: result.reason,
    };
  }
  return {
    shouldRemoveMessage: false,
    shouldSkipMemoryWrite: false,
    shouldMarkViolation: false,
    shouldWriteMessage: true,
    shouldWriteMemory: true,
    shouldUpdateWorld: true,
    shouldWriteDebug: true,
    reason: result.reason,
  };
}
