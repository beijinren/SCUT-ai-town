import { buildSceneProtocol } from '../../convex/aiTown/sceneProtocol';
import { SceneAgentSeed, SceneProtocol, StructuredScene } from '../../convex/aiTown/sceneTypes';
import { scenarioConfigToStructuredScene } from '../../convex/GM/setup/scenarioConfigAdapter';
import crossMajorCreativeWorkshopConfig from '../scenarios/cross_major_creative_workshop_ai_town/scenario_config.json';
import { getMapDefinition } from '../maps/mapCatalog.js';
import { MapId } from '../maps/registry';
import { casualCommonAreaScene } from './casualCommonArea';
import { pressConferenceScene } from './pressConference';
import { sharedWardPreopTwoGoalsScene } from './sharedWardPreopTwoGoals';

export interface SceneTemplateDefinition {
  id: string;
  label: string;
  scene: StructuredScene;
}

export interface SceneTemplateRuntime {
  definition: SceneTemplateDefinition;
  protocol: SceneProtocol;
  agentDescriptions: SceneAgentSeed[];
}

export function createSceneTemplateRuntime(
  definition: SceneTemplateDefinition,
): SceneTemplateRuntime {
  const protocol = buildSceneProtocol(definition.scene, { templateId: definition.id });
  return {
    definition,
    protocol,
    agentDescriptions: protocol.agentSeeds,
  };
}

export const pressConferenceTemplate: SceneTemplateDefinition = {
  id: 'press-conference',
  label: 'press conference',
  scene: pressConferenceScene,
};

export const casualCommonAreaTemplate: SceneTemplateDefinition = {
  id: 'casual-common-area',
  label: 'casual common area',
  scene: casualCommonAreaScene,
};

export const crossMajorCreativeWorkshopTemplate: SceneTemplateDefinition = {
  id: 'cross-major-creative-workshop-ai-town',
  label: 'cross-major creative workshop',
  scene: scenarioConfigToStructuredScene(crossMajorCreativeWorkshopConfig),
};

export const sharedWardPreopTwoGoalsTemplate: SceneTemplateDefinition = {
  id: 'shared-ward-preop-two-goals',
  label: 'shared ward preop two goals',
  scene: sharedWardPreopTwoGoalsScene,
};

export const sceneTemplateRegistry = {
  [pressConferenceTemplate.id]: createSceneTemplateRuntime(pressConferenceTemplate),
  [casualCommonAreaTemplate.id]: createSceneTemplateRuntime(casualCommonAreaTemplate),
  [crossMajorCreativeWorkshopTemplate.id]: createSceneTemplateRuntime(
    crossMajorCreativeWorkshopTemplate,
  ),
  [sharedWardPreopTwoGoalsTemplate.id]: createSceneTemplateRuntime(
    sharedWardPreopTwoGoalsTemplate,
  ),
};

export type SceneTemplateId = keyof typeof sceneTemplateRegistry & string;

export function isKnownSceneTemplateId(templateId: string): templateId is SceneTemplateId {
  return templateId in sceneTemplateRegistry;
}

export function getSceneTemplateById(templateId: SceneTemplateId): SceneTemplateRuntime {
  return sceneTemplateRegistry[templateId];
}

export function getSceneTemplateIdForMap(mapId: MapId): SceneTemplateId {
  const templateId = getMapDefinition(mapId).sceneTemplateId;
  if (!isKnownSceneTemplateId(templateId)) {
    throw new Error(`Unknown sceneTemplateId "${templateId}" for map "${mapId}"`);
  }
  return templateId;
}

export function getSceneTemplateForMap(mapId: MapId): SceneTemplateRuntime {
  return getSceneTemplateById(getSceneTemplateIdForMap(mapId));
}

export const defaultSceneTemplate = getSceneTemplateById('cross-major-creative-workshop-ai-town');

export const defaultSceneProtocol = defaultSceneTemplate.protocol;

export const defaultSceneAgentDescriptions = defaultSceneTemplate.agentDescriptions;
