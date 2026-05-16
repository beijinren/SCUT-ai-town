// 权限名保持开放字符串，避免框架层被某个具体场景绑死。
export type PermissionName = string;

// 阶段名也保持开放字符串，让不同实验场景自行定义阶段推进。
export type ScenePhase = string;

export const factVisibilities = ['public', 'private', 'shared', 'hidden'] as const;

export type FactVisibility = (typeof factVisibilities)[number];

export type SceneType = string;

export interface SceneRole {
  id: string;
  name: string;
  identity: string;
  character?: string;
  publicGoal: string;
  privateGoal: string;
  defaultPermissions: PermissionName[];
  knownFactIds: string[];
}

export interface SceneFact {
  id: string;
  title: string;
  content: string;
  visibility: FactVisibility;
  ownerRoleIds: string[];
  sharedWithRoleIds: string[];
  revealCondition?: string;
  tags?: string[];
}

export interface SceneEpisodeGoal {
  roleId: string;
  currentGoal: string;
}

export interface SceneEpisodeProximityEvent {
  turn: number;
  event: string;
  roleId: string;
  reason: string;
}

export interface SceneEpisode {
  id: string;
  title: string;
  timeLabel: string;
  participantRoleIds: string[];
  listenerRoleIds: string[];
  goals: SceneEpisodeGoal[];
  proximitySchedule: SceneEpisodeProximityEvent[];
  maxTurns?: number;
  exitRoleId?: string;
  exitTurn?: number;
}

export interface ScenePhaseRule {
  phase: ScenePhase;
  allowedPermissions: PermissionName[];
  blockedPermissions?: PermissionName[];
  description: string;
}

export interface StructuredScene {
  id: string;
  type: SceneType;
  title: string;
  schemaVersion?: string;
  sourceFormat?: string;
  publicSummary: string;
  location: string;
  tone: string;
  pressureSource: string[];
  currentPhase: ScenePhase;
  roles: SceneRole[];
  facts: SceneFact[];
  phaseRules: ScenePhaseRule[];
  episodes?: SceneEpisode[];
  defaultEpisodeId?: string;
  activeEpisodeId?: string;
}

export interface SceneView {
  sceneId: string;
  sceneType: SceneType;
  title: string;
  publicSummary: string;
  location: string;
  tone: string;
  currentPhase: ScenePhase;
  pressureSource: string[];
  role: SceneRole;
  currentEpisodeId?: string;
  currentEpisodeTitle?: string;
  currentGoal?: string;
  visibleFacts: SceneFact[];
  availablePermissions: PermissionName[];
}

export interface SceneWorldSeed {
  sceneTemplateId?: string;
  sceneId: string;
  sceneType: SceneType;
  title: string;
  schemaVersion?: string;
  sourceFormat?: string;
  publicSummary: string;
  location: string;
  tone: string;
  currentPhase: ScenePhase;
  pressureSource: string[];
  activeEpisodeId?: string;
  activeEpisodeTitle?: string;
  activeRoleIds?: string[];
  completedEpisodeIds?: string[];
  executedEventIds?: string[];
  episodeTurn?: number;
  roleIds: string[];
  roleNames: string[];
  publicFactIds: string[];
  hiddenFactIds: string[];
}

export interface SceneAgentSeed {
  roleId: string;
  name: string;
  character: string;
  publicProfile: string;
  identity: string;
  plan: string;
  visibleFactIds: string[];
  availablePermissions: PermissionName[];
}

export interface SceneUiState {
  scene: {
    templateId: string;
    id: string;
    type: SceneType;
    title: string;
    schemaVersion?: string;
    sourceFormat?: string;
    publicSummary: string;
    location: string;
    tone: string;
    currentPhase: ScenePhase;
    pressureSource: string[];
    activeEpisodeId?: string;
    activeEpisodeTitle?: string;
  };
  hiddenFacts: SceneFact[];
  phaseRules: ScenePhaseRule[];
  episodes: SceneEpisode[];
  roleViews: SceneView[];
}

export interface SceneProtocol {
  template: StructuredScene;
  worldSeed: SceneWorldSeed;
  agentSeeds: SceneAgentSeed[];
  uiState: SceneUiState;
}
