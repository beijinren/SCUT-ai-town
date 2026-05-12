import { RelationGraph } from '../graph/relationGraph';

describe('relation graph', () => {
  it('stores directional interaction edges separately', () => {
    const graph = new RelationGraph();
    graph.recordInteraction('alice', 'bob', 'event-1', 100);
    graph.recordInteraction('bob', 'alice', 'event-2', 200);

    expect(graph.getRelationEdge('alice', 'bob')?.interactionCount).toBe(1);
    expect(graph.getRelationEdge('bob', 'alice')?.interactionCount).toBe(1);
    expect(graph.getRelationEdge('alice', 'bob')).not.toEqual(graph.getRelationEdge('bob', 'alice'));
    expect(graph.summarizeRelation('alice', 'bob')).toContain('objective interaction');
  });
});
