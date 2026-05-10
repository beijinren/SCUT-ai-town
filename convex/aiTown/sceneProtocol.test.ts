import { pressConferenceProtocol, pressConferenceScene } from '../../data/scenes/pressConference';

describe('buildSceneProtocol', () => {
  test('worldSeed 只保留 world 初始化需要的全局场景字段', () => {
    expect(pressConferenceProtocol.worldSeed.sceneId).toBe(pressConferenceScene.id);
    expect(pressConferenceProtocol.worldSeed.roleNames).toEqual([
      '主持人',
      '公司发言人',
      '调查记者',
      '内部知情人',
      '行业观察员',
    ]);
    expect(pressConferenceProtocol.worldSeed.publicFactIds).toEqual([
      'fact_public_topic',
      'fact_public_rule',
    ]);
    expect(pressConferenceProtocol.worldSeed.hiddenFactIds).toEqual(['fact_hidden_root_cause']);
  });

  test('agentSeeds 为每个角色提供独立的种子描述', () => {
    const spokesperson = pressConferenceProtocol.agentSeeds.find(
      (seed) => seed.roleId === 'spokesperson',
    );

    expect(spokesperson).toBeDefined();
    expect(spokesperson?.name).toBe('公司发言人');
    expect(spokesperson?.visibleFactIds).toContain('fact_private_bottom_line');
    expect(spokesperson?.availablePermissions).toContain('announce');
  });

  test('uiState 暴露全局隐藏信息和角色视图', () => {
    expect(pressConferenceProtocol.uiState.hiddenFacts).toHaveLength(1);
    expect(pressConferenceProtocol.uiState.roleViews).toHaveLength(5);
    expect(pressConferenceProtocol.uiState.scene.currentPhase).toBe('opening');
  });
});
