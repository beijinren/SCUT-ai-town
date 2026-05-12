import { GMRelationEdge } from '../gmTypes';

export class RelationGraph {
  private edges = new Map<string, GMRelationEdge>();

  private key(fromAgentId: string, toAgentId: string) {
    return `${fromAgentId}->${toAgentId}`;
  }

  recordInteraction(fromAgentId: string, toAgentId: string, eventId: string, timestamp = Date.now()) {
    // Relation edges are directional on purpose: "Alice talked to Bob" and
    // "Bob talked to Alice" are objectively related but still distinct edges.
    const key = this.key(fromAgentId, toAgentId);
    const existing = this.edges.get(key);
    const sharedEvents = existing?.sharedEventIds ?? [];
    if (!sharedEvents.includes(eventId)) {
      sharedEvents.push(eventId);
    }
    const next: GMRelationEdge = {
      fromAgentId,
      toAgentId,
      interactionCount: (existing?.interactionCount ?? 0) + 1,
      lastInteractionAt: timestamp,
      sharedEventIds: sharedEvents,
      relationSummary: `Observed ${((existing?.interactionCount ?? 0) + 1).toString()} objective interaction(s).`,
    };
    this.edges.set(key, next);
    return next;
  }

  getRelationEdge(fromAgentId: string, toAgentId: string) {
    return this.edges.get(this.key(fromAgentId, toAgentId));
  }

  summarizeRelation(fromAgentId: string, toAgentId: string) {
    const edge = this.getRelationEdge(fromAgentId, toAgentId);
    if (!edge) {
      return 'No objective interaction recorded.';
    }
    // Keep this summary factual. Subjective trust or suspicion belongs to
    // agent reflection, not to the GM relation graph.
    return edge.relationSummary;
  }

  getEdges() {
    return [...this.edges.values()];
  }
}
