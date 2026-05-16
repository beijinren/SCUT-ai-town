import { decideIntervention } from '../intervention/intervention';
import { buildRollbackPlan } from '../intervention/rollbackPlan';

describe('intervention', () => {
  it('maps clear leakage to rollback behavior', () => {
    const result = {
      decision: 'clear_leakage' as const,
      interventionLevel: 3 as const,
      reason: 'Direct hidden fact leak.',
      matchedFactIds: ['hidden-1'],
      visibleFactIds: [],
      reasoningType: 'leakage' as const,
    };
    expect(decideIntervention(result).action).toBe('reject_or_rollback');
    const rollback = buildRollbackPlan(result);
    expect(rollback.shouldRemoveMessage).toBe(true);
    expect(rollback.shouldSkipMemoryWrite).toBe(true);
    expect(rollback.shouldWriteMessage).toBe(false);
    expect(rollback.shouldWriteMemory).toBe(false);
  });
});
