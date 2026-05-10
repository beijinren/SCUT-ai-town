import {
  PermissionName,
  SceneFact,
  ScenePhase,
  ScenePhaseRule,
  SceneRole,
  SceneView,
  StructuredScene,
} from './sceneTypes';

function assertRole(scene: StructuredScene, roleId: string): SceneRole {
  const role = scene.roles.find((candidate) => candidate.id === roleId);
  if (!role) {
    throw new Error(`Unknown role "${roleId}" in scene "${scene.id}"`);
  }
  return role;
}

function assertPhaseRule(scene: StructuredScene, phase: ScenePhase): ScenePhaseRule {
  const rule = scene.phaseRules.find((candidate) => candidate.phase === phase);
  if (!rule) {
    throw new Error(`Unknown phase rule "${phase}" in scene "${scene.id}"`);
  }
  return rule;
}

function roleKnowsFact(role: SceneRole, fact: SceneFact): boolean {
  return (
    role.knownFactIds.includes(fact.id) ||
    fact.ownerRoleIds.includes(role.id) ||
    fact.sharedWithRoleIds.includes(role.id)
  );
}

export function getVisibleFactsForRole(scene: StructuredScene, roleId: string): SceneFact[] {
  const role = assertRole(scene, roleId);
  return scene.facts.filter((fact) => {
    switch (fact.visibility) {
      case 'public':
        return true;
      case 'private':
        return fact.ownerRoleIds.includes(role.id) || role.knownFactIds.includes(fact.id);
      case 'shared':
        return roleKnowsFact(role, fact);
      case 'hidden':
        return false;
    }
  });
}

export function getAvailablePermissionsForRole(
  scene: StructuredScene,
  roleId: string,
  phase: ScenePhase = scene.currentPhase,
): PermissionName[] {
  const role = assertRole(scene, roleId);
  const rule = assertPhaseRule(scene, phase);
  const blocked = new Set(rule.blockedPermissions ?? []);
  const allowed = new Set(rule.allowedPermissions);
  return role.defaultPermissions.filter(
    (permission) => allowed.has(permission) && !blocked.has(permission),
  );
}

export function canRoleUsePermission(
  scene: StructuredScene,
  roleId: string,
  permission: PermissionName,
  phase: ScenePhase = scene.currentPhase,
): boolean {
  return getAvailablePermissionsForRole(scene, roleId, phase).includes(permission);
}

export function buildSceneViewForRole(scene: StructuredScene, roleId: string): SceneView {
  const role = assertRole(scene, roleId);
  return {
    sceneId: scene.id,
    sceneType: scene.type,
    title: scene.title,
    publicSummary: scene.publicSummary,
    location: scene.location,
    tone: scene.tone,
    currentPhase: scene.currentPhase,
    pressureSource: [...scene.pressureSource],
    role,
    visibleFacts: getVisibleFactsForRole(scene, roleId),
    availablePermissions: getAvailablePermissionsForRole(scene, roleId),
  };
}
