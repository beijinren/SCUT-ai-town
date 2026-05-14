import type {
  PermissionName,
  SceneFact,
  SceneRole,
  StructuredScene,
} from '../../aiTown/sceneTypes';
import { extractIdentitySlotRefs, toId } from './scenarioPersonaDealer';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function readRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function getSceneId(config: UnknownRecord): string {
  return toId(
    readString(config.run_name) ||
      readString(config.sceneId) ||
      readString(config.id) ||
      'scenario_config',
  );
}

function getSceneLocation(config: UnknownRecord): string {
  const directLocation = readString(config.location);
  if (directLocation) {
    return directLocation;
  }

  const locations = readStringArray(config.locations);
  return locations[0] ?? 'Unknown location';
}

function getActionPermissions(config: UnknownRecord): PermissionName[] {
  const actionAffordances = readStringArray(config.action_affordances);
  const availableActionTypes = readStringArray(config.available_action_types);
  const permissions = actionAffordances.length > 0 ? actionAffordances : availableActionTypes;

  return permissions.length > 0 ? permissions : ['observe', 'speak', 'ask_question'];
}

function buildRoleIdentity(displayName: string, agentConfig: UnknownRecord): string {
  const profile = readRecord(agentConfig.profile);
  const identityParts = [
    displayName,
    readString(profile.occupation),
    readString(profile.public_info),
    readString(profile.big_five),
    readString(profile.decision_making_style),
  ].filter((part) => part.length > 0);

  // This identity is used by the original agent seed builder, so keep it profile-oriented.
  // Private secrets are mapped into privateGoal instead of publicProfile to avoid accidental leaks.
  return identityParts.join('\n') || displayName;
}

function buildPrivateGoal(agentConfig: UnknownRecord): string {
  const profile = readRecord(agentConfig.profile);
  const goal = readString(agentConfig.goal, 'Follow the scenario objective and act in character.');
  const secret = readString(profile.secret);

  if (!secret) {
    return goal;
  }

  return `${goal}\n\nPrivate context from scenario profile: ${secret}`;
}

function buildPublicFacts(config: UnknownRecord): SceneFact[] {
  const scenarioText = readString(config.scenario) || readString(config.source_prompt);

  if (!scenarioText) {
    return [];
  }

  return [
    {
      id: 'fact_public_scenario_objective',
      title: 'Scenario objective',
      content: scenarioText,
      visibility: 'public',
      ownerRoleIds: [],
      sharedWithRoleIds: [],
      tags: ['scenario', 'objective'],
    },
  ];
}

function getInitialKnownFactIds(hasPublicScenarioFact: boolean): string[] {
  return hasPublicScenarioFact ? ['fact_public_scenario_objective'] : [];
}

function buildPrivateSecretFact(role: SceneRole, agentConfig: UnknownRecord): SceneFact | null {
  const profile = readRecord(agentConfig.profile);
  const secret = readString(profile.secret);

  if (!secret) {
    return null;
  }

  return {
    id: `fact_private_${role.id}_secret`,
    title: `Private context for ${role.name}`,
    content: secret,
    visibility: 'private',
    ownerRoleIds: [role.id],
    sharedWithRoleIds: [],
    tags: ['private_context', 'agent_profile'],
  };
}

export function scenarioConfigToStructuredScene(config: unknown): StructuredScene {
  if (!isRecord(config)) {
    throw new Error('Scenario config must be an object.');
  }

  const sceneId = getSceneId(config);
  const identitySlots = extractIdentitySlotRefs(config);
  const agents = Array.isArray(config.agents) ? config.agents : [];
  const defaultPermissions = getActionPermissions(config);
  const publicFacts = buildPublicFacts(config);
  const initialKnownFactIds = getInitialKnownFactIds(publicFacts.length > 0);

  const roles: SceneRole[] = identitySlots.map((slot, index) => {
    const agentConfig = readRecord(agents[index]);
    const character = readString(agentConfig.character, `f${(index % 8) + 1}`);
    const role: SceneRole = {
      id: slot.identitySlotId,
      name: slot.displayName,
      identity: buildRoleIdentity(slot.displayName, agentConfig),
      character,
      publicGoal: readString(agentConfig.goal, readString(config.scenario, 'Participate in the scene.')),
      privateGoal: buildPrivateGoal(agentConfig),
      defaultPermissions: [...defaultPermissions],
      knownFactIds: [...initialKnownFactIds],
    };

    const privateFactId = `fact_private_${role.id}_secret`;
    const profile = readRecord(agentConfig.profile);
    if (readString(profile.secret)) {
      role.knownFactIds.push(privateFactId);
    }

    return role;
  });

  const privateFacts = roles
    .map((role, index) => buildPrivateSecretFact(role, readRecord(agents[index])))
    .filter((fact): fact is SceneFact => fact !== null);

  return {
    id: sceneId,
    type: readString(config.time_label, 'json_scenario'),
    title: readString(config.run_name, sceneId),
    publicSummary: readString(config.scenario) || readString(config.source_prompt, 'Scenario from JSON config.'),
    location: getSceneLocation(config),
    tone: readString(config.tone, 'collaborative_experiment'),
    pressureSource: ['scenario_objective'],
    currentPhase: 'opening',
    roles,
    facts: [...publicFacts, ...privateFacts],
    phaseRules: [
      {
        phase: 'opening',
        allowedPermissions: [...defaultPermissions],
        description: 'Initial phase generated from scenario_config.json.',
      },
    ],
  };
}
