import { decideInteractionTiming } from './interactionTiming';
import { SerializedPlayer } from './player';
import { EnvironmentContext, SemanticActionCandidate } from './semanticEnvironment';

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

const casualScene = {
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
};

describe('decideInteractionTiming', () => {
  it('在轻松场景且目标很近时，会倾向主动接触', () => {
    const result = decideInteractionTiming({
      player: makePlayer({ id: 'p:self' }),
      otherFreePlayers: [makePlayer({ id: 'p:nearby', position: { x: 2, y: 1 } })],
      sceneState: casualScene,
      justLeftConversation: false,
      recentlyAttemptedInvite: false,
      doingActivity: false,
    });

    expect(result.shouldInitiate).toBe(true);
    expect(result.selectedPlayerId).toBe('p:nearby');
    expect(result.semanticTriggered).toBe(false);
  });

  it('刚尝试过主动接触时，会进入暂缓状态', () => {
    const result = decideInteractionTiming({
      player: makePlayer({ id: 'p:self' }),
      otherFreePlayers: [makePlayer({ id: 'p:nearby', position: { x: 1, y: 1 } })],
      sceneState: undefined,
      justLeftConversation: false,
      recentlyAttemptedInvite: true,
      doingActivity: false,
    });

    expect(result.shouldInitiate).toBe(false);
    expect(result.summary).toContain('最近刚尝试过互动');
  });

  it('高分语义候选会让 agent 先移动到物品附近', () => {
    const environmentContext: EnvironmentContext = {
      playerId: 'p:self',
      currentArea: {
        id: 'lounge_area',
        name: '休息区',
        type: 'lounge',
        tags: ['低压力', '适合闲聊'],
        socialMeaning: '适合低压力交流。',
      },
      nearbyObjects: [],
      nearbyPeople: [],
      environmentHints: ['饮料桌提供自然开场理由。'],
    };
    const semanticActionCandidates: SemanticActionCandidate[] = [
      {
        kind: 'move_to_object',
        targetObjectId: 'drink_table',
        destination: { x: 3, y: 4 },
        score: 4,
        reasons: ['饮料桌提供自然低压力开场理由。'],
      },
    ];

    const result = decideInteractionTiming({
      player: makePlayer({ id: 'p:self' }),
      otherFreePlayers: [],
      sceneState: casualScene,
      justLeftConversation: false,
      recentlyAttemptedInvite: false,
      doingActivity: false,
      environmentContext,
      semanticActionCandidates,
    });

    expect(result.shouldInitiate).toBe(false);
    expect(result.semanticTriggered).toBe(true);
    expect(result.selectedSemanticAction?.kind).toBe('move_to_object');
    expect(result.summary).toContain('饮料桌');
  });
});
