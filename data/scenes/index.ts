import { buildSceneProtocol } from '../../convex/aiTown/sceneProtocol';
import { SceneAgentSeed, SceneProtocol, StructuredScene } from '../../convex/aiTown/sceneTypes';
import { scenarioConfigToStructuredScene } from '../../convex/GM/setup/scenarioConfigAdapter';
import cafeEncounterConfig from '../scenarios/cafe_encounter/scenario_config.json';
import cafeNewProductDiscussionConfig from '../scenarios/cafe_new_product_discussion/scenario_config.json';
import cafeOrderingConfig from '../scenarios/cafe_ordering/scenario_config.json';
import cafeShareTableConfig from '../scenarios/cafe_share_table/scenario_config.json';
import hospitalDeepTalkConfig from '../scenarios/hospital_deep_talk/scenario_config.json';
import hospitalPriceCompareConfig from '../scenarios/hospital_price_compare/scenario_config.json';
import meetingRoomGroupMeetingConfig from '../scenarios/meeting_room_group_meeting/scenario_config.json';
import meetingRoomWaitingConfig from '../scenarios/meeting_room_waiting/scenario_config.json';
import parkIcebreakSocialConfig from '../scenarios/park_icebreak_social/scenario_config.json';
import parkWritingDiscussionConfig from '../scenarios/park_writing_discussion/scenario_config.json';

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

export const sotopiaSceneTemplates: SceneTemplateDefinition[] = [
  {
    id: 'meeting_room_group_meeting',
    label: 'meeting room group meeting',
    scene: scenarioConfigToStructuredScene(meetingRoomGroupMeetingConfig),
  },
  {
    id: 'meeting_room_waiting',
    label: 'meeting room waiting',
    scene: scenarioConfigToStructuredScene(meetingRoomWaitingConfig),
  },
  {
    id: 'cafe_encounter',
    label: 'cafe encounter',
    scene: scenarioConfigToStructuredScene(cafeEncounterConfig),
  },
  {
    id: 'cafe_share_table',
    label: 'cafe share table',
    scene: scenarioConfigToStructuredScene(cafeShareTableConfig),
  },
  {
    id: 'cafe_new_product_discussion',
    label: 'cafe new product discussion',
    scene: scenarioConfigToStructuredScene(cafeNewProductDiscussionConfig),
  },
  {
    id: 'cafe_ordering',
    label: 'cafe ordering',
    scene: scenarioConfigToStructuredScene(cafeOrderingConfig),
  },
  {
    id: 'park_writing_discussion',
    label: 'park writing discussion',
    scene: scenarioConfigToStructuredScene(parkWritingDiscussionConfig),
  },
  {
    id: 'park_icebreak_social',
    label: 'park icebreak social',
    scene: scenarioConfigToStructuredScene(parkIcebreakSocialConfig),
  },
  {
    id: 'hospital_deep_talk',
    label: 'hospital deep talk',
    scene: scenarioConfigToStructuredScene(hospitalDeepTalkConfig),
  },
  {
    id: 'hospital_price_compare',
    label: 'hospital price compare',
    scene: scenarioConfigToStructuredScene(hospitalPriceCompareConfig),
  },
];

export const defaultSceneTemplate = createSceneTemplateRuntime(sotopiaSceneTemplates[0]);

export const defaultSceneProtocol = defaultSceneTemplate.protocol;

export const defaultSceneAgentDescriptions = defaultSceneTemplate.agentDescriptions;
