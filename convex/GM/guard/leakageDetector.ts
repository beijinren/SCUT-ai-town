import { GMFact, GMGuardDecision } from '../gmTypes';

export interface LeakageDetectionResult {
  decision: Extract<GMGuardDecision, 'pass' | 'possible_leakage' | 'clear_leakage'>;
  matchedFactIds: string[];
  reason: string;
}

function factPatterns(fact: GMFact) {
  const patterns = [fact.content, fact.title, ...(fact.keywords ?? [])];
  return patterns
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length >= 4)
    .map((pattern) => pattern.toLowerCase());
}

function hasMemoryEvidence(fact: GMFact, memorySupportedFactIds: string[]) {
  return memorySupportedFactIds.includes(fact.id);
}

export function detectLeakage(
  output: string,
  restrictedFacts: GMFact[],
  knownFactIds: string[],
  memorySupportedFactIds: string[] = [],
) {
  const normalizedOutput = output.toLowerCase();
  const matchedFacts = restrictedFacts.filter((fact) => {
    if (knownFactIds.includes(fact.id)) {
      return false;
    }
    return factPatterns(fact).some((pattern) => normalizedOutput.includes(pattern));
  });

  if (matchedFacts.length === 0) {
    return {
      decision: 'pass',
      matchedFactIds: [],
      reason: 'No restricted fact substring matched.',
    } satisfies LeakageDetectionResult;
  }

  // A memory-supported fact is still sensitive, but it is less severe than
  // a completely pathless hidden-fact claim.
  const fullyUnsupportedMatches = matchedFacts.filter(
    (fact) => !hasMemoryEvidence(fact, memorySupportedFactIds),
  );
  const clearLeakage = fullyUnsupportedMatches.some((fact) =>
    normalizedOutput.includes(fact.content.toLowerCase()),
  );
  return {
    decision: clearLeakage ? 'clear_leakage' : 'possible_leakage',
    matchedFactIds: matchedFacts.map((fact) => fact.id),
    reason: clearLeakage
      ? 'Output directly states restricted fact content without a known path.'
      : 'Output overlaps with restricted fact wording and may leak hidden information or overstate uncertain memory.',
  } satisfies LeakageDetectionResult;
}
