import { calculateWillingnessScores } from '../willingness/willingnessCalculator';
import { resolveTurnOrder } from '../willingness/turnOrderResolver';
import { shouldRecomputeWillingness } from '../willingness/willingnessTrigger';
import { GMWillingnessContext } from '../gmTypes';

function makeContext(): GMWillingnessContext {
  return {
    conversationId: 'c1',
    participants: [
      { agentId: 'alice', name: 'Alice', position: { x: 0, y: 0 }, traits: { extroversion: 0.2 } },
      { agentId: 'bob', name: 'Bob', position: { x: 0, y: 0 }, plan: 'answer and clarify questions', traits: { caution: 0.1 } },
      { agentId: 'charlie', name: 'Charlie', position: { x: 0, y: 0 }, traits: { caution: 0.6 } },
    ],
    currentSpeakerId: 'alice',
    latestMessage: {
      id: 'm1',
      authorAgentId: 'alice',
      authorName: 'Alice',
      text: 'Bob, what did you see?',
      timestamp: 1,
    },
    directlyAddressedAgentIds: ['bob'],
    heardByAgentIds: ['alice', 'bob', 'charlie'],
  };
}

describe('willingness', () => {
  it('recomputes on first round', () => {
    expect(shouldRecomputeWillingness({ ...makeContext(), isFirstRound: true, latestMessage: undefined })).toBe(
      'first_round',
    );
  });

  it('recomputes when a new participant joins', () => {
    expect(shouldRecomputeWillingness({ ...makeContext(), newParticipantJoined: true })).toBe(
      'new_participant_joined',
    );
  });

  it('recomputes on direct question', () => {
    expect(shouldRecomputeWillingness(makeContext())).toBe('direct_question');
  });

  it('prioritizes directly addressed participants', () => {
    const scores = calculateWillingnessScores(makeContext());
    const result = resolveTurnOrder(scores, 'direct_question');
    expect(result.selectedNextSpeaker).toBe('bob');
  });

  it('reduces the score of the most recent speaker', () => {
    const baseline = calculateWillingnessScores({ ...makeContext(), currentSpeakerId: undefined });
    const withRecentSpeaker = calculateWillingnessScores({ ...makeContext(), currentSpeakerId: 'bob' });
    const baselineBob = baseline.find((item) => item.agentId === 'bob');
    const penalizedBob = withRecentSpeaker.find((item) => item.agentId === 'bob');
    expect(baselineBob).toBeDefined();
    expect(penalizedBob).toBeDefined();
    expect((penalizedBob?.score ?? 0)).toBeLessThan(baselineBob?.score ?? 0);
  });
});
