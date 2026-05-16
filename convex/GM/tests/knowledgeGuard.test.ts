import { judgeOutput } from '../guard/knowledgeGuard';
import { GMGuardContext } from '../gmTypes';

function makeGuardContext(): GMGuardContext {
  return {
    actor: {
      agentId: 'bob',
      name: 'Bob',
      position: { x: 0, y: 0 },
      traits: { tendencyToSpeculate: 0.8 },
    },
    visibleFacts: [{ factId: 'public-1', title: 'MissingDoc', content: 'A document is missing.', visibility: 'public' }],
    knownFacts: [{ id: 'public-1', title: 'MissingDoc', content: 'A document is missing.', visibility: 'public' }],
    allFacts: [
      { id: 'public-1', title: 'MissingDoc', content: 'A document is missing.', visibility: 'public' },
      {
        id: 'hidden-1',
        title: 'HiddenFact',
        content: 'Charlie hid the key under the sofa.',
        visibility: 'hidden',
        ownerAgentIds: ['charlie'],
      },
    ],
    recentMessages: [],
  };
}

describe('knowledge guard', () => {
  it('allows reasonable suspicion as level 0', () => {
    const result = judgeOutput(
      'bob',
      'I suspect someone may know more about the missing document.',
      makeGuardContext(),
    );
    expect(result.interventionLevel).toBe(0);
    expect(['reasonable_inference', 'personality_based_guess', 'unsupported_but_harmless']).toContain(
      result.decision,
    );
  });

  it('flags direct hidden fact leakage', () => {
    const result = judgeOutput('bob', 'I know Charlie hid the key under the sofa.', makeGuardContext());
    expect(result.decision).toBe('clear_leakage');
    expect(result.interventionLevel).toBe(3);
  });

  it('keeps personality-flavored guesses at level 0', () => {
    const result = judgeOutput(
      'bob',
      'I feel Alice might be holding something back.',
      makeGuardContext(),
    );
    expect(result.interventionLevel).toBe(0);
    expect(['reasonable_inference', 'personality_based_guess', 'unsupported_but_harmless']).toContain(
      result.decision,
    );
  });
});
