import { GMGuardResult, GMInterventionPlan } from '../gmTypes';

export function decideIntervention(result: GMGuardResult): GMInterventionPlan {
  // Keep the policy table tiny and explicit so later projects can swap in a
  // different intervention strategy without touching guard internals.
  switch (result.interventionLevel) {
    case 0:
      return { action: 'pass', level: 0, reason: result.reason };
    case 1:
      return { action: 'regenerate', level: 1, reason: result.reason };
    case 2:
      return { action: 'rewrite_demo', level: 2, reason: result.reason };
    case 3:
      return { action: 'reject_or_rollback', level: 3, reason: result.reason };
    default:
      return { action: 'pass', level: 0, reason: 'Unknown intervention level, defaulting to pass.' };
  }
}
