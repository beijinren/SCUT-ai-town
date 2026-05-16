export interface DirectedEdge<NodeId extends string = string, Payload = undefined> {
  from: NodeId;
  to: NodeId;
  payload?: Payload;
}

// The graph helpers stay array-based on purpose during the demo phase so they
// can be reused in tests, pure logic modules, and future DB-backed adapters.
export function addDirectedEdge<NodeId extends string, Payload>(
  edges: Array<DirectedEdge<NodeId, Payload>>,
  edge: DirectedEdge<NodeId, Payload>,
) {
  edges.push(edge);
  return edges;
}

export function getOutgoingEdges<NodeId extends string, Payload>(
  edges: Array<DirectedEdge<NodeId, Payload>>,
  nodeId: NodeId,
) {
  return edges.filter((edge) => edge.from === nodeId);
}

export function getIncomingEdges<NodeId extends string, Payload>(
  edges: Array<DirectedEdge<NodeId, Payload>>,
  nodeId: NodeId,
) {
  return edges.filter((edge) => edge.to === nodeId);
}

export function findPath<NodeId extends string, Payload>(
  edges: Array<DirectedEdge<NodeId, Payload>>,
  start: NodeId,
  goal: NodeId,
) {
  if (start === goal) {
    return [start];
  }
  const visited = new Set<NodeId>([start]);
  const queue: Array<{ node: NodeId; path: NodeId[] }> = [{ node: start, path: [start] }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    // Breadth-first traversal is enough here because we only need reachability
    // and an explainable shortest hop path for debug output.
    for (const edge of getOutgoingEdges(edges, current.node)) {
      if (visited.has(edge.to)) {
        continue;
      }
      const nextPath = [...current.path, edge.to];
      if (edge.to === goal) {
        return nextPath;
      }
      visited.add(edge.to);
      queue.push({ node: edge.to, path: nextPath });
    }
  }
  return null;
}

export function hasPath<NodeId extends string, Payload>(
  edges: Array<DirectedEdge<NodeId, Payload>>,
  start: NodeId,
  goal: NodeId,
) {
  return findPath(edges, start, goal) !== null;
}
