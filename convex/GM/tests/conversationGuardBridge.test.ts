import { guardGeneratedMessage } from '../bridge/conversationGuardBridge';
import { GMRuntimeContext } from '../gmTypes';

function makeRuntimeContext(): GMRuntimeContext {
  return {
    worldId: 'w1',
    sceneId: 'scene-1',
    sceneTitle: 'Shared Lounge',
    actors: [
      { agentId: 'bob', name: 'Bob', position: { x: 1, y: 1 } },
      { agentId: 'charlie', name: 'Charlie', position: { x: 2, y: 1 } },
    ],
    zones: [
      {
        id: 'scene-1',
        name: 'Shared Lounge',
        roomId: 'Shared Lounge',
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      },
    ],
    objects: [],
    facts: [
      {
        id: 'hidden-1',
        title: 'SecretKey',
        content: 'Charlie hid the key under the sofa.',
        visibility: 'hidden',
      },
      {
        id: 'public-1',
        title: 'OpenRoom',
        content: 'Everyone is in the shared lounge.',
        visibility: 'public',
      },
    ],
    messages: [],
    conversations: [
      {
        conversationId: 'c1',
        participantAgentIds: ['bob', 'charlie'],
      },
    ],
  };
}

describe('conversation guard bridge', () => {
  it('returns a regeneration prompt for possible leakage', () => {
    const result = guardGeneratedMessage({
      runtimeContext: makeRuntimeContext(),
      agentId: 'bob',
      conversationId: 'c1',
      rawOutput: 'I think SecretKey proves Charlie knows more than he admits.',
    });
    expect(result.shouldWrite).toBe(false);
    expect(result.shouldRegenerate).toBe(true);
    expect(result.regenerationPrompt).toContain('Reasonable suspicion is allowed.');
  });

  it('keeps a regeneration prompt available for clear leakage while blocking the write', () => {
    const result = guardGeneratedMessage({
      runtimeContext: makeRuntimeContext(),
      agentId: 'bob',
      conversationId: 'c1',
      rawOutput: 'I know Charlie hid the key under the sofa.',
    });
    expect(result.shouldWrite).toBe(false);
    expect(result.shouldRegenerate).toBe(false);
    expect(result.regenerationPrompt).toContain('Direct statements of hidden facts are not allowed.');
  });
});
