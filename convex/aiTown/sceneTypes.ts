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
  publicSummary: string;
  location: string;
  tone: string;
  pressureSource: string[];
  currentPhase: ScenePhase;
  roles: SceneRole[];
  facts: SceneFact[];
  phaseRules: ScenePhaseRule[];
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
  visibleFacts: SceneFact[];
  availablePermissions: PermissionName[];
}

export interface SceneWorldSeed {
  sceneId: string;
  sceneType: SceneType;
  title: string;
  publicSummary: string;
  location: string;
  tone: string;
  currentPhase: ScenePhase;
  pressureSource: string[];
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
    id: string;
    type: SceneType;
    title: string;
    publicSummary: string;
    location: string;
    tone: string;
    currentPhase: ScenePhase;
    pressureSource: string[];
  };
  hiddenFacts: SceneFact[];
  phaseRules: ScenePhaseRule[];
  roleViews: SceneView[];
}

export interface SceneProtocol {
  template: StructuredScene;
  worldSeed: SceneWorldSeed;
  agentSeeds: SceneAgentSeed[];
  uiState: SceneUiState;
}
