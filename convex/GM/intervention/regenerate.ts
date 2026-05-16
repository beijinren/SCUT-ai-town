import { GMGuardResult, GMObservation } from '../gmTypes';

export function buildRegenerationPrompt(
  agentId: string,
  originalOutput: string,
  guardResult: GMGuardResult,
  observation: GMObservation,
) {
  // This text is deliberately narrow: it does not re-explain the whole world,
  // it only constrains the retry to legitimate information sources.
  return [
    `Agent ${agentId}, your previous output referenced information this role should not state directly.`,
    `Previous output: ${originalOutput}`,
    `Guard reason: ${guardResult.reason}`,
    'Rewrite using only your observation, legitimate memories, and public information.',
    'Reasonable suspicion is allowed. Direct statements of hidden facts are not allowed.',
    'Current observation:',
    observation.text,
  ].join('\n');
}
