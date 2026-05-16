import { buildPerceptionForAgent } from '../perception/perception';
import { GMRuntimeContext } from '../gmTypes';

function makeContext(): GMRuntimeContext {
  return {
    worldId: 'w1',
    actors: [
      { agentId: 'alice', name: 'Alice', position: { x: 1, y: 1 } },
      { agentId: 'bob', name: 'Bob', position: { x: 2, y: 1 } },
      { agentId: 'charlie', name: 'Charlie', position: { x: 8, y: 8 } },
    ],
    zones: [
      { id: 'room-a', name: 'RoomA', roomId: 'RoomA', bounds: { minX: 0, minY: 0, maxX: 4, maxY: 4 } },
      { id: 'room-b', name: 'RoomB', roomId: 'RoomB', bounds: { minX: 6, minY: 6, maxX: 9, maxY: 9 } },
    ],
    objects: [{ id: 'table', name: 'Table', position: { x: 1, y: 2 }, roomId: 'RoomA' }],
    facts: [
      { id: 'f-public', title: 'PublicFact', content: 'The meeting started late.', visibility: 'public' },
      {
        id: 'f-hidden',
        title: 'HiddenFact',
        content: 'Charlie hid the key under the sofa.',
        visibility: 'hidden',
        knownBy: ['charlie'],
      },
      {
        id: 'f-shared',
        title: 'SharedFact',
        content: 'Bob and Alice share a note.',
        visibility: 'shared',
        sharedWithAgentIds: ['alice', 'bob'],
      },
    ],
    messages: [
      {
        id: 'm1',
        authorAgentId: 'bob',
        authorName: 'Bob',
        text: 'Can you hear me?',
        timestamp: 1,
        delivery: 'normal',
      },
    ],
    conversations: [],
  };
}

describe('perception', () => {
  it('shows same-room agents and hides different-room agents', () => {
    const perception = buildPerceptionForAgent(makeContext(), 'alice');
    expect(perception.visibleAgents).toContain('bob');
    expect(perception.visibleAgents).not.toContain('charlie');
  });

  it('does not include hidden facts without authorization', () => {
    const perception = buildPerceptionForAgent(makeContext(), 'alice');
    const factIds = perception.visibleFacts.map((fact) => fact.factId);
    expect(factIds).toContain('f-public');
    expect(factIds).toContain('f-shared');
    expect(factIds).not.toContain('f-hidden');
  });
});
