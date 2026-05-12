import { buildSceneProtocol } from '../../convex/aiTown/sceneProtocol';
import { SceneAgentSeed, SceneProtocol, StructuredScene } from '../../convex/aiTown/sceneTypes';
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

// 当前默认实验模板已切换为更轻松的公共休息区场景。
export const defaultSceneTemplate = createSceneTemplateRuntime(casualCommonAreaTemplate);

export const defaultSceneProtocol = defaultSceneTemplate.protocol;

export const defaultSceneAgentDescriptions = defaultSceneTemplate.agentDescriptions;
