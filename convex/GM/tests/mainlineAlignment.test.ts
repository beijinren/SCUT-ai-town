import { defaultSceneTemplate } from '../../../data/scenes';
import { InformationGraph } from '../graph/informationGraph';

describe('mainline alignment', () => {
  it('uses scenario_config.json workshop as the default scene', () => {
    expect(defaultSceneTemplate.definition.id).toBe('cross-major-creative-workshop-ai-town');
    expect(defaultSceneTemplate.definition.scene.id).toBe('cross_major_creative_workshop_ai_town');
    expect(defaultSceneTemplate.protocol.worldSeed.sceneId).toBe(
      'cross_major_creative_workshop_ai_town',
    );
    expect(defaultSceneTemplate.agentDescriptions.length).toBeGreaterThan(1);
  });

  it('round-trips InformationGraph snapshots for conversation propagation', () => {
    const graph = new InformationGraph();
    graph.addFact({
      id: 'message_fact_turn_1',
      title: 'Message 1',
      content: 'We should use the whiteboard for the prototype flow.',
      visibility: 'shared',
      ownerAgentIds: ['agent_a'],
      sharedWithAgentIds: ['agent_b'],
      knownBy: ['agent_a', 'agent_b'],
      source: 'conversation_message',
    });
    graph.markKnownBy(
      'message_fact_turn_1',
      'agent_b',
      'agent_a',
      'message text',
      'conversation',
    );

    const restored = InformationGraph.fromSnapshot(graph.toSnapshot());
    expect(restored.hasKnowledgePath('agent_b', 'message_fact_turn_1')).toBe(true);
    expect(restored.explainKnowledgePath('agent_b', 'message_fact_turn_1')).toEqual(['direct']);
    expect(restored.getEdges()).toEqual(graph.getEdges());
  });
});
