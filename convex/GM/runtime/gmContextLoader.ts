import { DatabaseReader } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { GMFact, GMRuntimeContext } from '../gmTypes';
import { defaultSceneTemplate } from '../../../data/scenes';

interface GMWorldSnapshot {
  sceneState?: {
    sceneId: string;
    title: string;
    location: string;
  } | null;
  players: Array<{
    id: string;
    position?: { x: number; y: number };
  }>;
  agents: Array<{
    id: string;
    playerId: string;
  }>;
  conversations: Array<{
    id: string;
    participants: Array<{
      playerId: string;
    }>;
  }>;
}

interface GMDescriptionsSnapshot {
  worldMap?: {
    width: number;
    height: number;
  } | null;
  playerDescriptions: Array<{
    playerId: string;
    name: string;
  }>;
  agentDescriptions: Array<{
    agentId: string;
    publicProfile: string;
    identity: string;
    plan: string;
  }>;
}

interface GMMessageSnapshot {
  _id?: string;
  _creationTime?: number;
  author: string;
  authorName?: string;
  conversationId?: string;
  text: string;
}

/**
 * 把任意来源的运行时快照整理成 GM 内部统一上下文。
 * 这个函数保持纯函数特性，方便 demo、单测和真实 Convex 读取共用一套结构。
 */
export function normalizeGMContext(snapshot: GMRuntimeContext): GMRuntimeContext {
  return {
    ...snapshot,
    actors: snapshot.actors.map((actor) => ({ ...actor, traits: actor.traits ?? {} })),
    zones: snapshot.zones.map((zone) => ({ ...zone })),
    objects: snapshot.objects.map((object) => ({ ...object })),
    facts: snapshot.facts.map((fact) => ({
      ...fact,
      keywords: fact.keywords ?? [],
      ownerAgentIds: fact.ownerAgentIds ?? [],
      sharedWithAgentIds: fact.sharedWithAgentIds ?? [],
      knownBy: fact.knownBy ?? [],
      memoryEvidenceAgentIds: fact.memoryEvidenceAgentIds ?? [],
    })),
    messages: snapshot.messages.map((message) => ({ ...message })),
    conversations: snapshot.conversations?.map((conversation) => ({ ...conversation })) ?? [],
  };
}

function buildFactKnowledgeMap(actorRoleByAgentId: Map<string, string>): GMFact[] {
  const scene = defaultSceneTemplate.definition.scene;
  return scene.facts.map((fact) => {
    const knownBy = [...actorRoleByAgentId.entries()]
      .filter(([, roleId]) => {
        const role = scene.roles.find((candidate) => candidate.id === roleId);
        if (!role) {
          return false;
        }
        return (
          role.knownFactIds.includes(fact.id) ||
          fact.ownerRoleIds.includes(roleId) ||
          fact.sharedWithRoleIds.includes(roleId)
        );
      })
      .map(([agentId]) => agentId);
    const ownerAgentIds = [...actorRoleByAgentId.entries()]
      .filter(([, roleId]) => fact.ownerRoleIds.includes(roleId))
      .map(([agentId]) => agentId);
    const sharedWithAgentIds = [...actorRoleByAgentId.entries()]
      .filter(([, roleId]) => fact.sharedWithRoleIds.includes(roleId))
      .map(([agentId]) => agentId);
    return {
      id: fact.id,
      title: fact.title,
      content: fact.content,
      visibility: fact.visibility,
      ownerAgentIds,
      sharedWithAgentIds,
      knownBy,
      keywords: [fact.title, ...(fact.tags ?? [])],
      source: 'scene_template',
    };
  });
}

/**
 * 用现有 world/query 快照组装最小可用的 GM 上下文。
 * 这里刻意保持只读适配，不把 GM 逻辑反向耦合进原世界模型。
 */
export function buildGMContextFromSnapshots(args: {
  worldId: string;
  world: GMWorldSnapshot;
  descriptions: GMDescriptionsSnapshot;
  messages: GMMessageSnapshot[];
}): GMRuntimeContext {
  const scene = defaultSceneTemplate.definition.scene;
  const sceneTitle = args.world.sceneState?.title ?? scene.title;
  const sceneLocation = args.world.sceneState?.location ?? scene.location;
  const playerDescriptionById = new Map(
    args.descriptions.playerDescriptions.map((description) => [description.playerId, description]),
  );
  const agentDescriptionById = new Map(
    args.descriptions.agentDescriptions.map((description) => [description.agentId, description]),
  );
  const actorRoleByAgentId = new Map<string, string>();

  const actors = args.world.agents.map((agent) => {
    const player = args.world.players.find((candidate) => candidate.id === agent.playerId);
    const playerDescription = playerDescriptionById.get(agent.playerId);
    const agentDescription = agentDescriptionById.get(agent.id);
    const matchedRole = scene.roles.find((role) => role.name === playerDescription?.name);
    if (matchedRole) {
      actorRoleByAgentId.set(agent.id, matchedRole.id);
    }
    return {
      agentId: agent.id,
      playerId: agent.playerId,
      name: playerDescription?.name ?? agent.playerId,
      position: player?.position ?? { x: 0, y: 0 },
      publicProfile: agentDescription?.publicProfile,
      identity: agentDescription?.identity,
      plan: agentDescription?.plan,
      roomId: sceneTitle,
      zoneId: args.world.sceneState?.sceneId ?? scene.id,
    };
  });

  const playerToAgentId = new Map(actors.map((actor) => [actor.playerId, actor.agentId]));
  const facts = buildFactKnowledgeMap(actorRoleByAgentId);
  const zoneId = args.world.sceneState?.sceneId ?? scene.id;
  const worldMap = args.descriptions.worldMap;

  return normalizeGMContext({
    worldId: args.worldId,
    sceneId: zoneId,
    sceneTitle,
    actors,
    zones: worldMap
      ? [
          {
            id: zoneId,
            name: sceneLocation,
            roomId: sceneTitle,
            bounds: {
              minX: 0,
              minY: 0,
              maxX: Math.max(0, worldMap.width - 1),
              maxY: Math.max(0, worldMap.height - 1),
            },
          },
        ]
      : [],
    objects: [],
    facts,
    messages: args.messages.map((message) => ({
      id: message._id ?? `${message.author}-${message._creationTime ?? Date.now()}`,
      conversationId: message.conversationId,
      authorAgentId: playerToAgentId.get(message.author),
      authorName: message.authorName ?? playerDescriptionById.get(message.author)?.name ?? message.author,
      text: message.text,
      timestamp: message._creationTime ?? Date.now(),
      roomId: sceneTitle,
      visibility: 'public',
      delivery: 'normal',
    })),
    conversations: args.world.conversations.map((conversation) => ({
      conversationId: conversation.id,
      participantAgentIds: conversation.participants
        .map((participant) => playerToAgentId.get(participant.playerId))
        .filter((agentId): agentId is string => Boolean(agentId)),
    })),
  });
}

/**
 * 直接从 Convex 读出一个 GM 上下文。
 * TODO: 后续替换成更完整的 scene/object/fact 适配器。
 */
export async function loadGMContext(
  db: DatabaseReader,
  worldId: Id<'worlds'>,
): Promise<GMRuntimeContext> {
  const world = await db.get(worldId);
  if (!world) {
    throw new Error(`World ${worldId} not found`);
  }

  // TODO: 等 GM 正式接到项目真实的 scene/object/fact 来源后，
  // 这里再替换成更稳定的场景适配器。
  const messages = await db
    .query('messages')
    .filter((q) => q.eq(q.field('worldId'), worldId))
    .collect();

  return normalizeGMContext({
    worldId,
    sceneId: world.sceneState?.sceneId,
    sceneTitle: world.sceneState?.title,
    actors: world.agents.map((agent) => {
      const player = world.players.find((candidate) => candidate.id === agent.playerId);
      return {
        agentId: agent.id,
        playerId: agent.playerId,
        name: player?.id ?? agent.playerId,
        position: player?.position ?? { x: 0, y: 0 },
      };
    }),
    zones: [],
    objects: [],
    facts: [],
    messages: messages.map((message) => ({
      id: String(message._id),
      conversationId: message.conversationId,
      authorName: message.author,
      text: message.text,
      timestamp: message._creationTime,
    })),
    conversations: world.conversations.map((conversation) => ({
      conversationId: conversation.id,
      participantAgentIds: world.agents
        .filter((agent) =>
          conversation.participants.some((participant) => participant.playerId === agent.playerId),
        )
        .map((agent) => agent.id),
    })),
  });
}

/**
 * 在保持原世界状态只读的前提下，把 GM 上下文收窄到某一场会话。
 */
export async function loadConversationContext(
  db: DatabaseReader,
  worldId: Id<'worlds'>,
  conversationId: string,
) {
  const context = await loadGMContext(db, worldId);
  return {
    ...context,
    // conversations 在类型上允许为空；这里兜底成空数组，避免只读上下文加载失败。
    conversations: (context.conversations ?? []).filter(
      (conversation) => conversation.conversationId === conversationId,
    ),
    messages: context.messages.filter((message) => message.conversationId === conversationId),
  };
}

/**
 * 在保持原世界状态只读的前提下，把 GM 上下文收窄到某个 agent。
 */
export async function loadAgentContext(
  db: DatabaseReader,
  worldId: Id<'worlds'>,
  agentId: string,
) {
  const context = await loadGMContext(db, worldId);
  return {
    ...context,
    actors: context.actors.filter((actor) => actor.agentId === agentId),
  };
}
