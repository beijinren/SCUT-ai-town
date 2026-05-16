import { buildSceneProtocol } from '../../convex/aiTown/sceneProtocol';
import { SceneAgentSeed, SceneProtocol, StructuredScene } from '../../convex/aiTown/sceneTypes';
import { scenarioConfigToStructuredScene } from '../../convex/GM/setup/scenarioConfigAdapter';
import crossMajorCreativeWorkshopConfig from '../scenarios/cross_major_creative_workshop_ai_town/scenario_config.json';
import { casualCommonAreaScene } from './casualCommonArea';
import { pressConferenceScene } from './pressConference';

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
  const protocol = buildSceneProtocol(definition.scene);
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

export const defaultSceneTemplate = createSceneTemplateRuntime(crossMajorCreativeWorkshopTemplate);

export const defaultSceneProtocol = defaultSceneTemplate.protocol;

export const defaultSceneAgentDescriptions = defaultSceneTemplate.agentDescriptions;
