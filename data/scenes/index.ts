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
  label: '企业危机发布会',
  scene: pressConferenceScene,
};

export const casualCommonAreaTemplate: SceneTemplateDefinition = {
  id: 'casual-common-area',
  label: '午后公共休息区',
  scene: casualCommonAreaScene,
};

export const crossMajorCreativeWorkshopTemplate: SceneTemplateDefinition = {
  id: 'cross-major-creative-workshop-ai-town',
  label: '跨专业创新工作坊',
  scene: scenarioConfigToStructuredScene(crossMajorCreativeWorkshopConfig),
};

// 主链路仍然是 init.ts 读取 defaultSceneProtocol，再生成 world 和 agent。
// 这里仅把默认输入切到统一场景库，避免 world/agent 和 persona 发牌器读两套模板。
export const defaultSceneTemplate = createSceneTemplateRuntime(crossMajorCreativeWorkshopTemplate);

export const defaultSceneProtocol = defaultSceneTemplate.protocol;

export const defaultSceneAgentDescriptions = defaultSceneTemplate.agentDescriptions;
