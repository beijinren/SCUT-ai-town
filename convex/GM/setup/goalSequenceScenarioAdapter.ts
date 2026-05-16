import type {
  PermissionName,
  SceneEpisode,
  SceneEpisodeGoal,
  SceneEpisodeProximityEvent,
  SceneFact,
  SceneRole,
  StructuredScene,
} from '../../aiTown/sceneTypes';
import { toId } from './scenarioPersonaDealer';

type UnknownRecord = Record<string, unknown>;

interface GoalSequenceIdentityProfile {
  occupation: string;
  publicInfo: string;
  medicalContext: string;
  privacyBoundary: string;
  practicalPressure: string;
  decisionMakingStyle: string;
  moralValues: string[];
  secret: string;
}

interface GoalSequenceIdentity {
  identityId: string;
  fullName: string;
  occupation: string;
  sceneRole: string;
  secret: string;
  baseGoal: string;
  profile: GoalSequenceIdentityProfile;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getSceneId(config: UnknownRecord): string {
  return toId(readString(config.run_name) || readString(config.id) || 'goal_sequence_scene');
}

function getSceneLocation(config: UnknownRecord): string {
  const directLocation = readString(config.location);
  if (directLocation) {
    return directLocation;
  }
  return readStringArray(config.locations)[0] ?? 'unknown_location';
}

function getActionPermissions(config: UnknownRecord): PermissionName[] {
  const permissions = [
    ...readStringArray(config.available_action_types),
    ...readStringArray(config.action_affordances),
  ];
  return permissions.length > 0 ? [...new Set(permissions)] : ['observe', 'speak', 'action'];
}

function readProfile(value: unknown): GoalSequenceIdentityProfile {
  const record = readRecord(value);
  return {
    occupation: readString(record.occupation),
    publicInfo: readString(record.public_info),
    medicalContext: readString(record.medical_context),
    privacyBoundary: readString(record.privacy_boundary),
    practicalPressure: readString(record.practical_pressure),
    decisionMakingStyle: readString(record.decision_making_style),
    moralValues: readStringArray(record.moral_values),
    secret: readString(record.secret),
  };
}

function readIdentity(value: unknown): GoalSequenceIdentity | null {
  const record = readRecord(value);
  const identityId = readString(record.identity_id);
  const fullName = readString(record.full_name);
  if (!identityId || !fullName) {
    return null;
  }
  return {
    identityId,
    fullName,
    occupation: readString(record.occupation),
    sceneRole: readString(record.scene_role),
    secret: readString(record.secret),
    baseGoal: readString(record.base_goal),
    profile: readProfile(record.profile),
  };
}

function pickCharacter(sceneRole: string, index: number): string {
  const normalized = sceneRole.toLowerCase();
  if (normalized.includes('doctor')) {
    return 'f6';
  }
  if (normalized.includes('patient')) {
    return index % 2 === 0 ? 'f4' : 'f5';
  }
  if (normalized.includes('family')) {
    return index % 2 === 0 ? 'f2' : 'f3';
  }
  return `f${(index % 8) + 1}`;
}

function buildRoleIdentity(identity: GoalSequenceIdentity): string {
  const profile = identity.profile;
  const parts = [
    `姓名：${identity.fullName}`,
    identity.occupation ? `职业：${identity.occupation}` : '',
    identity.sceneRole ? `场景角色：${identity.sceneRole}` : '',
    profile.publicInfo ? `公开背景：${profile.publicInfo}` : '',
    profile.medicalContext ? `医疗背景：${profile.medicalContext}` : '',
    profile.privacyBoundary ? `隐私边界：${profile.privacyBoundary}` : '',
    profile.practicalPressure ? `现实压力：${profile.practicalPressure}` : '',
    profile.decisionMakingStyle ? `决策风格：${profile.decisionMakingStyle}` : '',
    profile.moralValues.length > 0 ? `价值偏好：${profile.moralValues.join('、')}` : '',
  ].filter((part) => part.length > 0);

  return parts.join('\n');
}

function buildPrivateGoal(identity: GoalSequenceIdentity): string {
  const parts = [identity.baseGoal];
  const secret = identity.secret || identity.profile.secret;
  if (secret) {
    parts.push(`私下顾虑：${secret}`);
  }
  if (identity.profile.medicalContext) {
    parts.push(`医疗语境：${identity.profile.medicalContext}`);
  }
  return parts.filter((part) => part.length > 0).join('\n');
}

function buildPublicFacts(config: UnknownRecord): SceneFact[] {
  const scenarioText = readString(config.scenario);
  if (!scenarioText) {
    return [];
  }
  return [
    {
      id: 'fact_public_scene_background',
      title: '场景公开背景',
      content: scenarioText,
      visibility: 'public',
      ownerRoleIds: [],
      sharedWithRoleIds: [],
      tags: ['scenario', 'background'],
    },
  ];
}

function buildPrivateFacts(roles: SceneRole[], identities: GoalSequenceIdentity[]): SceneFact[] {
  return roles.flatMap((role, index) => {
    const identity = identities[index];
    const facts: SceneFact[] = [];
    const secret = identity.secret || identity.profile.secret;
    if (secret) {
      facts.push({
        id: `fact_private_${role.id}_secret`,
        title: `${role.name}的私下顾虑`,
        content: secret,
        visibility: 'private',
        ownerRoleIds: [role.id],
        sharedWithRoleIds: [],
        tags: ['secret', 'private_context'],
      });
    }
    if (identity.profile.medicalContext) {
      facts.push({
        id: `fact_private_${role.id}_medical_context`,
        title: `${role.name}掌握的医疗背景`,
        content: identity.profile.medicalContext,
        visibility: 'private',
        ownerRoleIds: [role.id],
        sharedWithRoleIds: [],
        tags: ['medical_context'],
      });
    }
    return facts;
  });
}

function buildRoles(
  identities: GoalSequenceIdentity[],
  defaultPermissions: PermissionName[],
  initialKnownFactIds: string[],
): SceneRole[] {
  return identities.map((identity, index) => {
    const roleId = toId(identity.sceneRole || identity.identityId);
    const knownFactIds = [...initialKnownFactIds];
    if (identity.secret || identity.profile.secret) {
      knownFactIds.push(`fact_private_${roleId}_secret`);
    }
    if (identity.profile.medicalContext) {
      knownFactIds.push(`fact_private_${roleId}_medical_context`);
    }
    return {
      id: roleId,
      name: identity.fullName,
      identity: buildRoleIdentity(identity),
      character: pickCharacter(identity.sceneRole, index),
      publicGoal: identity.baseGoal || '保持角色一致并参与当前场景。',
      privateGoal: buildPrivateGoal(identity),
      defaultPermissions: [...defaultPermissions],
      knownFactIds,
    };
  });
}

function buildEpisodeGoals(
  rawGoals: unknown,
  roleIdByIdentityId: Map<string, string>,
): SceneEpisodeGoal[] {
  if (!Array.isArray(rawGoals)) {
    return [];
  }
  return rawGoals.flatMap((value) => {
    const record = readRecord(value);
    const identityId = readString(record.identity_id);
    const currentGoal = readString(record.current_goal);
    const roleId = roleIdByIdentityId.get(identityId);
    if (!roleId || !currentGoal) {
      return [];
    }
    return [{ roleId, currentGoal }];
  });
}

function buildEpisodeParticipants(
  names: string[],
  roleIdByName: Map<string, string>,
): string[] {
  return names
    .map((name) => roleIdByName.get(name))
    .filter((roleId): roleId is string => typeof roleId === 'string');
}

function buildProximitySchedule(
  rawSchedule: unknown,
  roleIdByName: Map<string, string>,
): SceneEpisodeProximityEvent[] {
  if (!Array.isArray(rawSchedule)) {
    return [];
  }
  return rawSchedule.flatMap((value) => {
    const record = readRecord(value);
    const roleId = roleIdByName.get(readString(record.agent));
    const turn = readNumber(record.turn);
    if (!roleId || turn === null) {
      return [];
    }
    return [
      {
        turn,
        event: readString(record.event, 'unknown_event'),
        roleId,
        reason: readString(record.reason),
      },
    ];
  });
}

function buildEpisodes(
  config: UnknownRecord,
  roleIdByIdentityId: Map<string, string>,
  roleIdByName: Map<string, string>,
): SceneEpisode[] {
  const rawEpisodes = Array.isArray(config.goal_sequence) ? config.goal_sequence : [];
  return rawEpisodes.flatMap((value, index) => {
    const record = readRecord(value);
    const episodeId = readString(record.episode_id) || `episode_${index + 1}`;
    const title = readString(record.time_label) || episodeId;
    const willingnessPolicy = readRecord(record.willingness_policy);
    const exitRoleName = readString(willingnessPolicy.exit_agent);
    return [
      {
        id: toId(episodeId),
        title,
        timeLabel: readString(record.time_label, title),
        participantRoleIds: buildEpisodeParticipants(
          readStringArray(record.initial_group_participants),
          roleIdByName,
        ),
        listenerRoleIds: buildEpisodeParticipants(
          readStringArray(record.initial_group_listeners),
          roleIdByName,
        ),
        goals: buildEpisodeGoals(record.goal_assignments, roleIdByIdentityId),
        proximitySchedule: buildProximitySchedule(record.proximity_schedule, roleIdByName),
        maxTurns: readNumber(willingnessPolicy.max_turns) ?? undefined,
        exitRoleId: roleIdByName.get(exitRoleName),
        exitTurn: readNumber(willingnessPolicy.exit_turn) ?? undefined,
      },
    ];
  });
}

export function goalSequenceScenarioToStructuredScene(config: unknown): StructuredScene {
  if (!isRecord(config)) {
    throw new Error('Goal sequence scenario config must be an object.');
  }

  const identities = (Array.isArray(config.identities) ? config.identities : [])
    .map(readIdentity)
    .filter((identity): identity is GoalSequenceIdentity => identity !== null);
  if (identities.length === 0) {
    throw new Error('Goal sequence scenario must contain at least one valid identity.');
  }

  const defaultPermissions = getActionPermissions(config);
  const publicFacts = buildPublicFacts(config);
  const initialKnownFactIds = publicFacts.map((fact) => fact.id);
  const roles = buildRoles(identities, defaultPermissions, initialKnownFactIds);
  const roleIdByIdentityId = new Map(
    identities.map((identity) => [identity.identityId, toId(identity.sceneRole || identity.identityId)]),
  );
  const roleIdByName = new Map(roles.map((role) => [role.name, role.id]));
  const privateFacts = buildPrivateFacts(roles, identities);
  const episodes = buildEpisodes(config, roleIdByIdentityId, roleIdByName);
  const defaultEpisodeId = episodes[0]?.id;

  return {
    id: getSceneId(config),
    type: readString(config.scene_type, 'goal_sequence_scene'),
    title: readString(config.run_name, 'goal_sequence_scene'),
    schemaVersion: readString(config.schema_version),
    sourceFormat: 'sotopia_goal_sequence_v1',
    publicSummary: readString(config.scenario, 'Scenario imported from goal sequence JSON.'),
    location: getSceneLocation(config),
    tone: 'high_stakes_shared_room',
    pressureSource: ['shared_room_privacy', 'medical_uncertainty', 'multi_party_coordination'],
    currentPhase: 'opening',
    roles,
    facts: [...publicFacts, ...privateFacts],
    phaseRules: [
      {
        phase: 'opening',
        allowedPermissions: [...defaultPermissions],
        description: '导入后的初始阶段。角色按当前 episode 目标和权限开始行动。',
      },
    ],
    episodes,
    defaultEpisodeId,
    activeEpisodeId: defaultEpisodeId,
  };
}
