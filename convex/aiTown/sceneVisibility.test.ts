import { pressConferenceScene } from '../../data/scenes/pressConference';
import {
  buildSceneViewForRole,
  canRoleUsePermission,
  getAvailablePermissionsForRole,
  getVisibleFactsForRole,
} from './sceneVisibility';

describe('getVisibleFactsForRole', () => {
  test('发言人能看到公开信息和自己的私有信息', () => {
    const facts = getVisibleFactsForRole(pressConferenceScene, 'spokesperson');
    const factIds = facts.map((fact) => fact.id);

    expect(factIds).toContain('fact_public_topic');
    expect(factIds).toContain('fact_public_rule');
    expect(factIds).toContain('fact_private_bottom_line');
    expect(factIds).toContain('fact_shared_control_note');
    expect(factIds).not.toContain('fact_private_internal_issue');
    expect(factIds).not.toContain('fact_hidden_root_cause');
  });

  test('调查记者只能看到自己有权限知道的共享线索', () => {
    const facts = getVisibleFactsForRole(pressConferenceScene, 'investigative_reporter');
    const factIds = facts.map((fact) => fact.id);

    expect(factIds).toContain('fact_shared_media_lead');
    expect(factIds).not.toContain('fact_shared_control_note');
  });
});

describe('getAvailablePermissionsForRole', () => {
  test('主持人在 opening 阶段不能打断', () => {
    const permissions = getAvailablePermissionsForRole(pressConferenceScene, 'moderator');

    expect(permissions).toContain('moderate');
    expect(permissions).toContain('announce');
    expect(permissions).not.toContain('interrupt');
  });

  test('记者在 conflict 阶段可以打断', () => {
    expect(
      canRoleUsePermission(pressConferenceScene, 'investigative_reporter', 'interrupt', 'conflict'),
    ).toBe(true);
  });
});

describe('buildSceneViewForRole', () => {
  test('能为内部知情人生成角色视图', () => {
    const view = buildSceneViewForRole(pressConferenceScene, 'internal_staff');
    const factIds = view.visibleFacts.map((fact) => fact.id);

    expect(view.role.name).toBe('内部知情人');
    expect(view.currentPhase).toBe('opening');
    expect(view.availablePermissions).toEqual(['observe']);
    expect(factIds).toContain('fact_private_internal_issue');
  });
});
