import { GMFact, GMFactVisibility } from '../gmTypes';
import { DirectedEdge, addDirectedEdge, findPath } from './graphUtils';

type KnowledgeEdgePayload = {
  factId: string;
  sourceType?: 'observation' | 'conversation' | 'memory' | 'system' | 'event';
  evidence?: string;
  round?: number;
  conversationId?: string;
  messageUuid?: string;
};

export type InformationGraphSnapshot = {
  facts: GMFact[];
  knownBy: Array<{ factId: string; agentIds: string[] }>;
  edges: Array<DirectedEdge<string, KnowledgeEdgePayload>>;
};

export class InformationGraph {
  private facts = new Map<string, GMFact>();
  private knownBy = new Map<string, Set<string>>();
  private edges: Array<DirectedEdge<string, KnowledgeEdgePayload>> = [];

  static fromSnapshot(snapshot?: Partial<InformationGraphSnapshot> | null) {
    const graph = new InformationGraph();
    if (!snapshot) {
      return graph;
    }
    for (const fact of snapshot.facts ?? []) {
      graph.facts.set(fact.id, {
        ...fact,
        keywords: fact.keywords ?? [],
        ownerAgentIds: fact.ownerAgentIds ?? [],
        sharedWithAgentIds: fact.sharedWithAgentIds ?? [],
        knownBy: fact.knownBy ?? [],
      });
    }
    for (const entry of snapshot.knownBy ?? []) {
      graph.knownBy.set(entry.factId, new Set(entry.agentIds));
    }
    graph.edges = [...(snapshot.edges ?? [])];
    return graph;
  }

  addFact(fact: GMFact) {
    // Facts are normalized at the boundary so later callers can swap in
    // database rows without defensive null checks throughout the graph logic.
    const normalized: GMFact = {
      ...fact,
      keywords: fact.keywords ?? [],
      ownerAgentIds: fact.ownerAgentIds ?? [],
      sharedWithAgentIds: fact.sharedWithAgentIds ?? [],
      knownBy: fact.knownBy ?? [],
    };
    this.facts.set(fact.id, normalized);
    const seededKnownBy = new Set<string>(normalized.knownBy);
    if (normalized.visibility === 'public') {
      seededKnownBy.add('*public*');
    }
    for (const owner of normalized.ownerAgentIds ?? []) {
      seededKnownBy.add(owner);
    }
    for (const shared of normalized.sharedWithAgentIds ?? []) {
      seededKnownBy.add(shared);
    }
    this.knownBy.set(fact.id, seededKnownBy);
    return normalized;
  }

  getFact(factId: string) {
    return this.facts.get(factId);
  }

  getFacts() {
    return [...this.facts.values()];
  }

  markKnownBy(
    factId: string,
    toAgentId: string,
    sourceId?: string,
    evidence?: string,
    sourceType: KnowledgeEdgePayload['sourceType'] = 'conversation',
  ) {
    const known = this.knownBy.get(factId) ?? new Set<string>();
    known.add(toAgentId);
    this.knownBy.set(factId, known);
    if (sourceId) {
      addDirectedEdge(this.edges, {
        from: sourceId,
        to: toAgentId,
        payload: { factId, sourceType, evidence },
      });
    }
  }

  hasKnowledgePath(agentId: string, factId: string) {
    const fact = this.facts.get(factId);
    if (!fact) {
      return false;
    }
    const known = this.knownBy.get(factId) ?? new Set<string>();
    if (known.has(agentId)) {
      return true;
    }
    if (fact.visibility === 'public') {
      return true;
    }
    // Ownership and explicit sharing are treated as legal first-class paths,
    // even if we have not yet materialized a graph edge for them.
    if (fact.ownerAgentIds?.includes(agentId) || fact.sharedWithAgentIds?.includes(agentId)) {
      return true;
    }
    return false;
  }

  getKnownFacts(agentId: string) {
    return this.getFacts().filter((fact) => this.hasKnowledgePath(agentId, fact.id));
  }

  explainKnowledgePath(agentId: string, factId: string) {
    const fact = this.facts.get(factId);
    if (!fact) {
      return null;
    }
    if (fact.visibility === 'public') {
      return ['public'];
    }
    if (fact.ownerAgentIds?.includes(agentId)) {
      return ['owner'];
    }
    if (fact.sharedWithAgentIds?.includes(agentId)) {
      return ['shared'];
    }
    const direct = this.knownBy.get(factId);
    if (direct?.has(agentId)) {
      return ['direct'];
    }
    const candidateSources = [
      ...(fact.ownerAgentIds ?? []),
      ...(fact.sharedWithAgentIds ?? []),
      ...(fact.knownBy ?? []),
    ];
    for (const source of candidateSources) {
      const path = findPath(
        this.edges.filter((edge) => edge.payload?.factId === factId),
        source,
        agentId,
      );
      if (path) {
        return path;
      }
    }
    return null;
  }

  getEdges() {
    return [...this.edges];
  }

  toSnapshot(): InformationGraphSnapshot {
    return {
      facts: this.getFacts(),
      knownBy: [...this.knownBy.entries()].map(([factId, agentIds]) => ({
        factId,
        agentIds: [...agentIds],
      })),
      edges: this.getEdges(),
    };
  }

  getFactVisibility(factId: string): GMFactVisibility | undefined {
    return this.facts.get(factId)?.visibility;
  }
}
