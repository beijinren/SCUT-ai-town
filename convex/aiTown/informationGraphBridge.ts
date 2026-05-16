import type { MutationCtx } from '../_generated/server';
import { InformationGraph } from '../GM/graph/informationGraph';
import type { GMFact } from '../GM/gmTypes';
import type { GameId } from './ids';

type RecordMessagePropagationArgs = {
  worldId: string;
  sceneId?: string;
  conversationId: GameId<'conversations'>;
  messageUuid: string;
  text: string;
  speakerAgentId: string;
  heardByAgentIds: string[];
  round: number;
  createdAt: number;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function runIdForConversation(conversationId: string) {
  return `conversation_${conversationId}`;
}

export async function recordMessagePropagation(
  ctx: MutationCtx,
  args: RecordMessagePropagationArgs,
) {
  const db = ctx.db as any;
  const graphDoc = await db
    .query('informationGraphs')
    .withIndex('conversation', (q: any) =>
      q.eq('worldId', args.worldId).eq('conversationId', args.conversationId),
    )
    .unique();

  const graph = InformationGraph.fromSnapshot(graphDoc?.graph);
  const heardByAgentIds = unique([args.speakerAgentId, ...args.heardByAgentIds]);
  const fact: GMFact = {
    id: `message_fact_${args.messageUuid}`,
    title: `Message ${args.round}`,
    content: args.text,
    visibility: 'shared',
    ownerAgentIds: [args.speakerAgentId],
    sharedWithAgentIds: heardByAgentIds.filter((agentId) => agentId !== args.speakerAgentId),
    knownBy: heardByAgentIds,
    source: 'conversation_message',
  };

  graph.addFact(fact);
  for (const listenerAgentId of heardByAgentIds) {
    graph.markKnownBy(
      fact.id,
      listenerAgentId,
      listenerAgentId === args.speakerAgentId ? undefined : args.speakerAgentId,
      args.text,
      'conversation',
    );
  }

  const graphPayload = graph.toSnapshot();
  const patch = {
    worldId: args.worldId,
    sceneId: args.sceneId,
    runId: runIdForConversation(args.conversationId),
    conversationId: args.conversationId,
    currentRound: args.round,
    updatedAt: args.createdAt,
    graph: graphPayload,
    exportPath: `InformationGraph/${args.sceneId ?? 'unknown_scene'}/${runIdForConversation(
      args.conversationId,
    )}/round_${args.round}/information_graph.json`,
  };

  if (graphDoc) {
    await db.patch(graphDoc._id, patch);
  } else {
    await db.insert('informationGraphs', {
      createdAt: args.createdAt,
      ...patch,
    });
  }
}
