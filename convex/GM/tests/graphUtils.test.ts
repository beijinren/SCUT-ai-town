import {
  addDirectedEdge,
  findPath,
  getIncomingEdges,
  getOutgoingEdges,
  hasPath,
} from '../graph/graphUtils';

describe('graph utils', () => {
  it('finds a simple directed path', () => {
    const edges: Array<{ from: string; to: string }> = [];
    addDirectedEdge(edges, { from: 'A', to: 'B' });
    addDirectedEdge(edges, { from: 'B', to: 'C' });

    expect(getOutgoingEdges(edges, 'A')).toHaveLength(1);
    expect(getIncomingEdges(edges, 'C')).toHaveLength(1);
    expect(hasPath(edges, 'A', 'C')).toBe(true);
    expect(findPath(edges, 'A', 'C')).toEqual(['A', 'B', 'C']);
  });
});
