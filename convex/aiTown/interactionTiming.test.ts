import { decideInteractionTiming } from './interactionTiming';
import { SerializedPlayer } from './player';

function makePlayer(overrides: Partial<SerializedPlayer>): SerializedPlayer {
  return {
    id: 'p:test',
    lastInput: Date.now(),
    position: { x: 0, y: 0 },
    facing: { dx: 1, dy: 0 },
    speed: 0,
    ...overrides,
  };
}

describe('decideInteractionTiming', () => {
  test('在轻松场景且目标很近时，会倾向主动接触', () => {
    const result = decideInteractionTiming({
      player: makePlayer({ id: 'p:self' }),
      interactionCandidates: [
        {
          player: makePlayer({ id: 'p:nearby', position: { x: 2, y: 1 } }),
          source: 'free_player',
        },
      ],
      sceneState: {
        sceneTemplateId: 'test-scene-template',
        sceneId: 'scene',
        sceneType: 'casual',
        title: '休息区',
        publicSummary: '轻松场景',
        location: '休息区',
        tone: '轻松、开放、低压力',
        currentPhase: 'free_roam',
        pressureSource: [],
        roleIds: [],
        roleNames: [],
        publicFactIds: [],
        hiddenFactIds: [],
      },
      justLeftConversation: false,
      recentlyAttemptedInvite: false,
      doingActivity: false,
    });

    expect(result.shouldInitiate).toBe(true);
    expect(result.selectedPlayerId).toBe('p:nearby');
  });

  test('刚尝试过主动接触时，会进入暂缓状态', () => {
    const result = decideInteractionTiming({
      player: makePlayer({ id: 'p:self' }),
      interactionCandidates: [
        {
          player: makePlayer({ id: 'p:nearby', position: { x: 1, y: 1 } }),
          source: 'free_player',
        },
      ],
      sceneState: undefined,
      justLeftConversation: false,
      recentlyAttemptedInvite: true,
      doingActivity: false,
    });

    expect(result.shouldInitiate).toBe(false);
    expect(result.summary).toContain('最近刚尝试过互动');
  });

  test('附近已有正在进行的会话时，会优先考虑加入多人对话', () => {
    const result = decideInteractionTiming({
      player: makePlayer({ id: 'p:self' }),
      interactionCandidates: [
        {
          player: makePlayer({ id: 'p:solo', position: { x: 2, y: 2 } }),
          source: 'free_player',
        },
        {
          player: makePlayer({ id: 'p:group_anchor', position: { x: 3, y: 2 } }),
          source: 'active_conversation',
          conversationId: 'c:1',
          participantCount: 3,
        },
      ],
      sceneState: {
        sceneTemplateId: 'test-scene-template',
        sceneId: 'scene',
        sceneType: 'casual',
        title: '休息区',
        publicSummary: '轻松场景',
        location: '休息区',
        tone: '轻松、开放、低压力',
        currentPhase: 'free_roam',
        pressureSource: [],
        roleIds: [],
        roleNames: [],
        publicFactIds: [],
        hiddenFactIds: [],
      },
      justLeftConversation: false,
      recentlyAttemptedInvite: false,
      doingActivity: false,
    });

    expect(result.shouldInitiate).toBe(true);
    expect(result.selectedPlayerId).toBe('p:group_anchor');
    expect(result.candidateScores[0].source).toBe('active_conversation');
  });
});
