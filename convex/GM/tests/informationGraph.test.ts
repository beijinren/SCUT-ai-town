import { InformationGraph } from '../graph/informationGraph';

describe('information graph', () => {
  it('tracks knowledge paths', () => {
    const graph = new InformationGraph();
    graph.addFact({
      id: 'F001',
      title: 'Secret',
      content: 'The key is under the sofa.',
      visibility: 'hidden',
      ownerAgentIds: ['alice'],
    });

    expect(graph.hasKnowledgePath('bob', 'F001')).toBe(false);
    graph.markKnownBy('F001', 'bob', 'alice', 'Alice told Bob directly.');
    expect(graph.hasKnowledgePath('bob', 'F001')).toBe(true);
    expect(graph.explainKnowledgePath('bob', 'F001')).toEqual(['direct']);
  });
});
