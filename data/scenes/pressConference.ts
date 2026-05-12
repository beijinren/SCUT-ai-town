import { buildSceneProtocol } from '../../convex/aiTown/sceneProtocol';
import { SceneAgentSeed, StructuredScene } from '../../convex/aiTown/sceneTypes';

export const pressConferenceScene: StructuredScene = {
  id: 'scene_press_001',
  type: 'press_conference',
  title: '关于安全事故的紧急发布会',
  publicSummary:
    '一家科技企业在发生重大安全事故后召开紧急发布会。媒体、公司代表与现场观察者都在关注事故责任与信息披露。',
  location: '总部一层新闻发布厅',
  tone: '紧张、克制、敌意上升',
  pressureSource: ['公众舆论升温', '公司内部口径未完全统一', '现场角色掌握信息不对称'],
  currentPhase: 'opening',
  roles: [
    {
      id: 'moderator',
      name: '主持人',
      identity: '企业公关主持',
      character: 'f1',
      publicGoal: '维持发布会秩序并推进流程',
      privateGoal: '避免发布会失控并减少负面扩散',
      defaultPermissions: ['moderate', 'announce', 'interrupt'],
      knownFactIds: ['fact_public_topic', 'fact_shared_control_note'],
    },
    {
      id: 'spokesperson',
      name: '公司发言人',
      identity: '企业官方代表',
      character: 'f4',
      publicGoal: '回应质疑并维护公司形象',
      privateGoal: '避免关键责任链被现场追问出来',
      defaultPermissions: ['announce', 'question'],
      knownFactIds: ['fact_public_topic', 'fact_private_bottom_line', 'fact_shared_control_note'],
    },
    {
      id: 'investigative_reporter',
      name: '调查记者',
      identity: '独立媒体记者',
      character: 'f6',
      publicGoal: '获取新增事实并公开追问',
      privateGoal: '逼出公司口径中的矛盾点',
      defaultPermissions: ['question', 'interrupt'],
      knownFactIds: ['fact_public_topic', 'fact_shared_media_lead'],
    },
    {
      id: 'internal_staff',
      name: '内部知情人',
      identity: '企业中层员工',
      character: 'f3',
      publicGoal: '保持低调，避免被关注',
      privateGoal: '权衡是否在关键时刻释放部分内幕',
      defaultPermissions: ['observe', 'question'],
      knownFactIds: ['fact_public_topic', 'fact_private_internal_issue'],
    },
    {
      id: 'industry_observer',
      name: '行业观察员',
      identity: '行业研究机构代表',
      character: 'f7',
      publicGoal: '分析事件走向',
      privateGoal: '判断公司是否存在系统性治理问题',
      defaultPermissions: ['observe', 'question'],
      knownFactIds: ['fact_public_topic', 'fact_shared_media_lead'],
    },
  ],
  facts: [
    {
      id: 'fact_public_topic',
      title: '发布会主题',
      content: '公司因近期安全事故召开紧急发布会。',
      visibility: 'public',
      ownerRoleIds: [],
      sharedWithRoleIds: [],
      tags: ['topic'],
    },
    {
      id: 'fact_public_rule',
      title: '现场规则',
      content: '发布会由主持人统一控场，问题需要按流程提出。',
      visibility: 'public',
      ownerRoleIds: [],
      sharedWithRoleIds: [],
      tags: ['rule'],
    },
    {
      id: 'fact_private_bottom_line',
      title: '发言人私下底线',
      content: '不得在发布会上承认决策失误，只能承诺后续调查。',
      visibility: 'private',
      ownerRoleIds: ['spokesperson'],
      sharedWithRoleIds: [],
      tags: ['private_goal'],
    },
    {
      id: 'fact_private_internal_issue',
      title: '内部知情问题',
      content: '事故发生前曾有人提交过内部风险提醒，但未被采纳。',
      visibility: 'private',
      ownerRoleIds: ['internal_staff'],
      sharedWithRoleIds: [],
      tags: ['risk'],
    },
    {
      id: 'fact_shared_control_note',
      title: '控场要求',
      content: '主持人与发言人都知道发布会需要避免进入责任链细节。',
      visibility: 'shared',
      ownerRoleIds: ['moderator', 'spokesperson'],
      sharedWithRoleIds: ['moderator', 'spokesperson'],
      tags: ['control'],
    },
    {
      id: 'fact_shared_media_lead',
      title: '媒体线索',
      content: '记者与观察员都已听说事故可能涉及更早期的管理问题。',
      visibility: 'shared',
      ownerRoleIds: ['investigative_reporter', 'industry_observer'],
      sharedWithRoleIds: ['investigative_reporter', 'industry_observer'],
      tags: ['lead'],
    },
    {
      id: 'fact_hidden_root_cause',
      title: '未公开根因',
      content: '事故根因与高层压缩安全预算有关。',
      visibility: 'hidden',
      ownerRoleIds: [],
      sharedWithRoleIds: [],
      revealCondition: '当记者连续追问且知情人选择松口时可暴露',
      tags: ['root_cause'],
    },
  ],
  phaseRules: [
    {
      phase: 'opening',
      allowedPermissions: ['announce', 'moderate', 'observe'],
      blockedPermissions: ['interrupt'],
      description: '开场阶段强调秩序与信息发布。',
    },
    {
      phase: 'questioning',
      allowedPermissions: ['announce', 'question', 'moderate', 'observe'],
      description: '提问阶段允许正式问答。',
    },
    {
      phase: 'conflict',
      allowedPermissions: ['announce', 'question', 'interrupt', 'moderate', 'observe'],
      description: '冲突阶段允许追问与打断，信息压力快速上升。',
    },
    {
      phase: 'closing',
      allowedPermissions: ['announce', 'moderate', 'observe'],
      blockedPermissions: ['interrupt'],
      description: '收束阶段以控制信息出口为主。',
    },
  ],
};

export const pressConferenceProtocol = buildSceneProtocol(pressConferenceScene);

export function buildPressConferenceAgentDescriptions(): SceneAgentSeed[] {
  return pressConferenceProtocol.agentSeeds;
}

export const pressConferenceAgentDescriptions = buildPressConferenceAgentDescriptions();
