import {
  SceneAgentSeed,
  SceneEpisode,
  SceneProtocol,
  SceneUiState,
  SceneView,
  SceneWorldSeed,
  StructuredScene,
} from './sceneTypes';
import { buildSceneViewForRole } from './sceneVisibility';

function getActiveEpisode(scene: StructuredScene): SceneEpisode | null {
  if (!scene.episodes || scene.episodes.length === 0) {
    return null;
  }
  const activeEpisodeId = scene.activeEpisodeId ?? scene.defaultEpisodeId;
  if (!activeEpisodeId) {
    return scene.episodes[0] ?? null;
  }
  return scene.episodes.find((candidate) => candidate.id === activeEpisodeId) ?? scene.episodes[0] ?? null;
}

function buildSceneWorldSeed(scene: StructuredScene, templateId: string): SceneWorldSeed {
  const activeEpisode = getActiveEpisode(scene);
  return {
    sceneTemplateId: templateId,
    sceneId: scene.id,
    sceneType: scene.type,
    title: scene.title,
    schemaVersion: scene.schemaVersion,
    sourceFormat: scene.sourceFormat,
    publicSummary: scene.publicSummary,
    location: scene.location,
    tone: scene.tone,
    currentPhase: scene.currentPhase,
    pressureSource: [...scene.pressureSource],
    activeEpisodeId: activeEpisode?.id,
    activeEpisodeTitle: activeEpisode?.title,
    activeRoleIds: activeEpisode
      ? [...activeEpisode.participantRoleIds, ...activeEpisode.listenerRoleIds]
      : scene.roles.map((role) => role.id),
    completedEpisodeIds: [],
    executedEventIds: [],
    episodeTurn: 0,
    roleIds: scene.roles.map((role) => role.id),
    roleNames: scene.roles.map((role) => role.name),
    publicFactIds: scene.facts.filter((fact) => fact.visibility === 'public').map((fact) => fact.id),
    hiddenFactIds: scene.facts.filter((fact) => fact.visibility === 'hidden').map((fact) => fact.id),
  };
}

function buildSceneAgentSeed(view: SceneView): SceneAgentSeed {
  const visibleFactSummary =
    view.visibleFacts.length > 0
      ? view.visibleFacts.map((fact) => `${fact.title}：${fact.content}`).join('\n')
      : '你当前没有额外的场景事实。';
  const permissionSummary = view.availablePermissions.join('、') || '无';
  const publicProfile = [
    `角色身份：${view.role.identity}。`,
    `当前位于场景：${view.title}。`,
    `场景地点：${view.location}。`,
    `场景公开背景：${view.publicSummary}`,
  ].join('\n');

  return {
    roleId: view.role.id,
    name: view.role.name,
    character: view.role.character ?? 'f1',
    publicProfile,
    identity: [
      `你当前所处的场景是：${view.title}。`,
      `场景类型：${view.sceneType}。`,
      `你的身份是：${view.role.identity}。`,
      `场景公开背景：${view.publicSummary}`,
      `当前阶段：${view.currentPhase}。`,
      `场景地点：${view.location}。`,
      `场景氛围：${view.tone}。`,
      `你当前能看到的事实如下：`,
      visibleFactSummary,
    ].join('\n'),
    plan: [
      `你的基础公开目标：${view.role.publicGoal}。`,
      `你的基础私下目标：${view.role.privateGoal}。`,
      `你当前阶段的具体目标：${view.currentGoal ?? '暂无额外阶段目标，请先根据基础目标行动。'}。`,
      `你当前允许执行的社交权限：${permissionSummary}。`,
      `请在保持角色身份的前提下，根据你已知的信息和权限做出反应。`,
    ].join('\n'),
    visibleFactIds: view.visibleFacts.map((fact) => fact.id),
    availablePermissions: [...view.availablePermissions],
  };
}

function buildSceneUiState(
  scene: StructuredScene,
  templateId: string,
  roleViews: SceneView[],
): SceneUiState {
  const activeEpisode = getActiveEpisode(scene);
  return {
    scene: {
      templateId,
      id: scene.id,
      type: scene.type,
      title: scene.title,
      schemaVersion: scene.schemaVersion,
      sourceFormat: scene.sourceFormat,
      publicSummary: scene.publicSummary,
      location: scene.location,
      tone: scene.tone,
      currentPhase: scene.currentPhase,
      pressureSource: [...scene.pressureSource],
      activeEpisodeId: activeEpisode?.id,
      activeEpisodeTitle: activeEpisode?.title,
    },
    hiddenFacts: scene.facts.filter((fact) => fact.visibility === 'hidden'),
    phaseRules: [...scene.phaseRules],
    episodes: [...(scene.episodes ?? [])],
    roleViews,
  };
}

export function buildSceneProtocol(
  scene: StructuredScene,
  options?: { templateId?: string },
): SceneProtocol {
  const roleViews = scene.roles.map((role) => buildSceneViewForRole(scene, role.id));
  const templateId = options?.templateId ?? scene.id;
  return {
    template: scene,
    worldSeed: buildSceneWorldSeed(scene, templateId),
    agentSeeds: roleViews.map(buildSceneAgentSeed),
    uiState: buildSceneUiState(scene, templateId, roleViews),
  };
}
