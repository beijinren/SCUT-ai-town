import { defaultSceneTemplate, getSceneTemplateById, isKnownSceneTemplateId } from '../../data/scenes';
import { createSceneAgent } from './sceneAgentFactory';
import { buildSceneProtocol } from './sceneProtocol';
import { Game } from './game';
import { AgentDescription } from './agentDescription';
import { SceneAgentSeed, SceneEpisode, SceneWorldSeed, StructuredScene } from './sceneTypes';

function cloneSceneWithEpisode(scene: StructuredScene, activeEpisodeId?: string): StructuredScene {
  return {
    ...scene,
    activeEpisodeId: activeEpisodeId ?? scene.activeEpisodeId ?? scene.defaultEpisodeId,
  };
}

export function resolveSceneTemplateRuntime(sceneState?: SceneWorldSeed | null) {
  const templateId = sceneState?.sceneTemplateId;
  if (templateId && isKnownSceneTemplateId(templateId)) {
    return getSceneTemplateById(templateId);
  }
  return defaultSceneTemplate;
}

export function getActiveEpisodeForSceneState(
  scene: StructuredScene,
  sceneState?: SceneWorldSeed | null,
): SceneEpisode | null {
  if (!scene.episodes || scene.episodes.length === 0) {
    return null;
  }
  const activeEpisodeId =
    sceneState?.activeEpisodeId ?? scene.activeEpisodeId ?? scene.defaultEpisodeId;
  if (!activeEpisodeId) {
    return scene.episodes[0] ?? null;
  }
  return scene.episodes.find((episode) => episode.id === activeEpisodeId) ?? scene.episodes[0] ?? null;
}

export function ensureSceneRuntimeState(sceneState?: SceneWorldSeed | null): SceneWorldSeed {
  const sceneTemplate = resolveSceneTemplateRuntime(sceneState);
  const baseSeed = sceneTemplate.protocol.worldSeed;
  const mergedState: SceneWorldSeed = {
    ...baseSeed,
    ...(sceneState ?? {}),
  };
  const activeEpisode = getActiveEpisodeForSceneState(sceneTemplate.definition.scene, mergedState);
  if (activeEpisode) {
    mergedState.activeEpisodeId = activeEpisode.id;
    mergedState.activeEpisodeTitle = activeEpisode.title;
    mergedState.activeRoleIds =
      mergedState.activeRoleIds && mergedState.activeRoleIds.length > 0
        ? mergedState.activeRoleIds
        : [...activeEpisode.participantRoleIds, ...activeEpisode.listenerRoleIds];
  } else if (!mergedState.activeRoleIds || mergedState.activeRoleIds.length === 0) {
    mergedState.activeRoleIds = [...baseSeed.roleIds];
  }
  mergedState.completedEpisodeIds = [...(mergedState.completedEpisodeIds ?? [])];
  mergedState.executedEventIds = [...(mergedState.executedEventIds ?? [])];
  mergedState.episodeTurn = mergedState.episodeTurn ?? 0;
  return mergedState;
}

export function getSceneAgentDescriptionsForState(sceneState?: SceneWorldSeed | null): SceneAgentSeed[] {
  const normalizedState = ensureSceneRuntimeState(sceneState);
  const sceneTemplate = resolveSceneTemplateRuntime(normalizedState);
  const protocol = buildSceneProtocol(
    cloneSceneWithEpisode(sceneTemplate.definition.scene, normalizedState.activeEpisodeId),
    { templateId: sceneTemplate.definition.id },
  );
  const allowedRoleIds = new Set(normalizedState.activeRoleIds ?? protocol.agentSeeds.map((seed) => seed.roleId));
  const filtered = protocol.agentSeeds.filter((seed) => allowedRoleIds.has(seed.roleId));
  return filtered.length > 0 ? filtered : protocol.agentSeeds;
}

function getEventId(episodeId: string, event: { turn: number; roleId: string; event: string }) {
  return `${episodeId}:${event.turn}:${event.roleId}:${event.event}`;
}

function getRoleSeedMap(sceneState?: SceneWorldSeed | null) {
  const seeds = getSceneAgentDescriptionsForState(sceneState);
  return new Map(seeds.map((seed) => [seed.roleId, seed]));
}

function findAgentDescriptionByRole(game: Game, roleId: string): AgentDescription | null {
  for (const [agentId, agentDescription] of game.agentDescriptions.entries()) {
    if (agentDescription.roleId === roleId) {
      return agentDescription;
    }
    const agent = game.world.agents.get(agentId);
    if (!agent) {
      continue;
    }
    const playerDescription = game.playerDescriptions.get(agent.playerId);
    if (!playerDescription) {
      continue;
    }
    const roleSeed = getRoleSeedMap(game.world.sceneState).get(roleId);
    if (roleSeed && playerDescription.name === roleSeed.name) {
      agentDescription.roleId = roleId;
      game.descriptionsModified = true;
      return agentDescription;
    }
  }
  return null;
}

function getSpawnPositionForRole(game: Game, roleId: string) {
  const directMarker = game.worldMap.getSpawnMarkers(roleId)[0];
  if (directMarker) {
    return { x: directMarker.x, y: directMarker.y };
  }
  const fallbackMarker = game.worldMap.getSpawnMarkers()[0];
  return fallbackMarker ? { x: fallbackMarker.x, y: fallbackMarker.y } : undefined;
}

function syncRoleAgent(
  game: Game,
  now: number,
  roleId: string,
  roleSeed: SceneAgentSeed,
) {
  const existingDescription = findAgentDescriptionByRole(game, roleId);
  if (!existingDescription) {
    createSceneAgent(game, now, roleSeed, getSpawnPositionForRole(game, roleId));
    return;
  }
  existingDescription.roleId = roleId;
  existingDescription.publicProfile = roleSeed.publicProfile;
  existingDescription.identity = roleSeed.identity;
  existingDescription.plan = roleSeed.plan;
  game.descriptionsModified = true;
}

function syncActiveEpisodeAgents(game: Game, now: number, sceneState: SceneWorldSeed) {
  const roleSeedMap = getRoleSeedMap(sceneState);
  for (const roleId of sceneState.activeRoleIds ?? []) {
    const roleSeed = roleSeedMap.get(roleId);
    if (!roleSeed) {
      continue;
    }
    syncRoleAgent(game, now, roleId, roleSeed);
  }
}

function shouldAdvanceEpisode(sceneState: SceneWorldSeed, episode: SceneEpisode) {
  if (episode.maxTurns !== undefined && sceneState.episodeTurn !== undefined) {
    return sceneState.episodeTurn >= episode.maxTurns;
  }
  if (episode.exitTurn !== undefined && sceneState.episodeTurn !== undefined) {
    return sceneState.episodeTurn >= episode.exitTurn;
  }
  return false;
}

function advanceToNextEpisode(sceneState: SceneWorldSeed) {
  const sceneTemplate = resolveSceneTemplateRuntime(sceneState);
  const scene = sceneTemplate.definition.scene;
  const currentEpisode = getActiveEpisodeForSceneState(scene, sceneState);
  if (!currentEpisode || !scene.episodes) {
    return sceneState;
  }
  const currentIndex = scene.episodes.findIndex((episode) => episode.id === currentEpisode.id);
  const nextEpisode = currentIndex >= 0 ? scene.episodes[currentIndex + 1] : undefined;
  sceneState.completedEpisodeIds = Array.from(
    new Set([...(sceneState.completedEpisodeIds ?? []), currentEpisode.id]),
  );
  if (!nextEpisode) {
    return sceneState;
  }
  sceneState.activeEpisodeId = nextEpisode.id;
  sceneState.activeEpisodeTitle = nextEpisode.title;
  sceneState.activeRoleIds = [...nextEpisode.participantRoleIds, ...nextEpisode.listenerRoleIds];
  sceneState.episodeTurn = 0;
  return sceneState;
}

function executeDueEvents(game: Game, now: number, sceneState: SceneWorldSeed) {
  const sceneTemplate = resolveSceneTemplateRuntime(sceneState);
  const episode = getActiveEpisodeForSceneState(sceneTemplate.definition.scene, sceneState);
  if (!episode) {
    return;
  }
  const executed = new Set(sceneState.executedEventIds ?? []);
  const roleSeedMap = getRoleSeedMap(sceneState);
  for (const event of episode.proximitySchedule) {
    const eventId = getEventId(episode.id, event);
    if (executed.has(eventId) || (sceneState.episodeTurn ?? 0) < event.turn) {
      continue;
    }
    if (event.event === 'enter_range') {
      const roleSeed = roleSeedMap.get(event.roleId);
      if (roleSeed) {
        syncRoleAgent(game, now, event.roleId, roleSeed);
      }
      sceneState.activeRoleIds = Array.from(
        new Set([...(sceneState.activeRoleIds ?? []), event.roleId]),
      );
    }
    executed.add(eventId);
  }
  sceneState.executedEventIds = [...executed];
}

export function advanceSceneRuntime(game: Game, now: number) {
  const sceneState = ensureSceneRuntimeState(game.world.sceneState);
  const sceneTemplate = resolveSceneTemplateRuntime(sceneState);
  const activeEpisode = getActiveEpisodeForSceneState(sceneTemplate.definition.scene, sceneState);
  if (!activeEpisode) {
    game.world.sceneState = sceneState;
    return sceneState;
  }

  sceneState.episodeTurn = (sceneState.episodeTurn ?? 0) + 1;
  executeDueEvents(game, now, sceneState);

  if (shouldAdvanceEpisode(sceneState, activeEpisode)) {
    advanceToNextEpisode(sceneState);
    syncActiveEpisodeAgents(game, now, sceneState);
  } else {
    syncActiveEpisodeAgents(game, now, sceneState);
  }

  game.world.sceneState = sceneState;
  return sceneState;
}
