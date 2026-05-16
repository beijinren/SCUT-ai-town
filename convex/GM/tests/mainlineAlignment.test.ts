import { defaultSceneTemplate, getSceneTemplateForMap } from '../../../data/scenes';
import { ensureSceneRuntimeState, getSceneAgentDescriptionsForState } from '../../aiTown/sceneRuntime';
import { InformationGraph } from '../graph/informationGraph';

describe('mainline alignment', () => {
  it('uses scenario_config.json workshop as the default scene', () => {
    expect(defaultSceneTemplate.definition.id).toBe('cross-major-creative-workshop-ai-town');
    expect(defaultSceneTemplate.definition.scene.id).toBe('cross_major_creative_workshop_ai_town');
    expect(defaultSceneTemplate.protocol.worldSeed.sceneId).toBe(
      'cross_major_creative_workshop_ai_town',
    );
    expect(defaultSceneTemplate.agentDescriptions.length).toBeGreaterThan(1);
  });

  it('binds hospital_ward to the shared ward pre-op scene template', () => {
    const hospitalScene = getSceneTemplateForMap('hospital_ward');
    const seededState = ensureSceneRuntimeState(hospitalScene.protocol.worldSeed);
    const initialAgents = getSceneAgentDescriptionsForState(seededState);
    expect(hospitalScene.definition.id).toBe('shared-ward-preop-two-goals');
    expect(hospitalScene.definition.scene.id).toBe('shared_ward_preop_two_goals');
    expect(hospitalScene.protocol.worldSeed.sceneTemplateId).toBe('shared-ward-preop-two-goals');
    expect(hospitalScene.protocol.worldSeed.activeEpisodeId).toBe('goal_1_daily_ward_interaction');
    expect(hospitalScene.agentDescriptions).toHaveLength(5);
    expect(hospitalScene.definition.scene.episodes?.length).toBe(2);
    expect(seededState.activeRoleIds).toEqual([
      'bed_1_patient',
      'bed_1_family',
      'bed_2_patient',
      'bed_2_family',
    ]);
    expect(initialAgents.map((agent) => agent.name)).toEqual([
      'Zhang Guilan',
      'Li Wen',
      'Wang Qiang',
      'Liu Fang',
    ]);
  });

  it('builds episode-specific agent goals for the second ward episode', () => {
    const hospitalScene = getSceneTemplateForMap('hospital_ward');
    const episodeTwoState = ensureSceneRuntimeState({
      ...hospitalScene.protocol.worldSeed,
      activeEpisodeId: 'goal_2_doctor_preop_discussion',
      activeRoleIds: [
        'bed_1_patient',
        'bed_1_family',
        'bed_2_patient',
        'bed_2_family',
        'attending_doctor',
      ],
    });
    const episodeTwoAgents = getSceneAgentDescriptionsForState(episodeTwoState);
    const doctorSeed = episodeTwoAgents.find((agent) => agent.roleId === 'attending_doctor');
    expect(episodeTwoAgents).toHaveLength(5);
    expect(doctorSeed?.name).toBe('Dr. Chen');
    expect(doctorSeed?.plan).toContain('你当前阶段的具体目标：Enter the room');
  });

  it('round-trips InformationGraph snapshots for conversation propagation', () => {
    const graph = new InformationGraph();
    graph.addFact({
      id: 'message_fact_turn_1',
      title: 'Message 1',
      content: 'We should use the whiteboard for the prototype flow.',
      visibility: 'shared',
      ownerAgentIds: ['agent_a'],
      sharedWithAgentIds: ['agent_b'],
      knownBy: ['agent_a', 'agent_b'],
      source: 'conversation_message',
    });
    graph.markKnownBy(
      'message_fact_turn_1',
      'agent_b',
      'agent_a',
      'message text',
      'conversation',
    );

    const restored = InformationGraph.fromSnapshot(graph.toSnapshot());
    expect(restored.hasKnowledgePath('agent_b', 'message_fact_turn_1')).toBe(true);
    expect(restored.explainKnowledgePath('agent_b', 'message_fact_turn_1')).toEqual(['shared']);
    expect(restored.getEdges()).toEqual(graph.getEdges());
  });
});
