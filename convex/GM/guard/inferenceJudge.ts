import { GMActor, GMFact, GMGuardDecision } from '../gmTypes';

const hedgePhrases = ['i suspect', 'maybe', 'i think', 'i feel', 'it seems', 'perhaps', 'might'];

export interface InferenceJudgeResult {
  decision: Extract<
    GMGuardDecision,
    'pass' | 'reasonable_inference' | 'personality_based_guess' | 'unsupported_but_harmless'
  >;
  reason: string;
}

function hasHedgePhrase(output: string) {
  const normalized = output.toLowerCase();
  return hedgePhrases.some((phrase) => normalized.includes(phrase));
}

function mentionsRestrictedFact(output: string, hiddenFacts: GMFact[]) {
  const normalized = output.toLowerCase();
  return hiddenFacts.some(
    (fact) =>
      normalized.includes(fact.content.toLowerCase()) || normalized.includes(fact.title.toLowerCase()),
  );
}

function referencesObservableSignals(output: string, observableFacts: GMFact[]) {
  const normalized = output.toLowerCase();
  return observableFacts.some(
    (fact) =>
      normalized.includes(fact.title.toLowerCase()) || normalized.includes(fact.content.toLowerCase()),
  );
}

export function judgeInference(
  output: string,
  actor: GMActor,
  hiddenFacts: GMFact[],
  observableFacts: GMFact[] = [],
): InferenceJudgeResult {
  if (mentionsRestrictedFact(output, hiddenFacts)) {
    return {
      decision: 'pass',
      reason: 'Output references restricted content, so inference fallback should not override leakage checks.',
    };
  }
  if (hasHedgePhrase(output)) {
    // The GM should bias toward allowing uncertain, role-shaped reasoning.
    if (referencesObservableSignals(output, observableFacts)) {
      return {
        decision: 'reasonable_inference',
        reason: 'Output is hedged and ties itself to observable context instead of asserting hidden facts.',
      };
    }
    const speculationWeight = actor.traits?.tendencyToSpeculate ?? 0;
    if (speculationWeight >= 0.5 || actor.traits?.labels?.includes('speculative')) {
      return {
        decision: 'personality_based_guess',
        reason: 'Output uses hedged language and matches a speculation-prone personality profile.',
      };
    }
    return {
      decision: 'reasonable_inference',
      reason: 'Output is framed as a guess rather than a claim of hidden fact knowledge.',
    };
  }
  return {
    decision: 'unsupported_but_harmless',
    reason: 'No direct leakage found, but the statement is not explicitly grounded by hedge phrases.',
  };
}
