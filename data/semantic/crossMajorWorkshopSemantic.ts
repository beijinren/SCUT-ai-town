import type { SemanticArea, SemanticObject } from '../../convex/aiTown/worldMap';

/**
 * 临时语义数据放在独立文件里，而不是塞进 init.ts。
 * 这样 Unity 正式导出 semanticObjects / semanticAreas 后，只需要替换这个数据来源。
 */
export function createDemoSemanticAreas(sceneId: string): SemanticArea[] {
  return [
    {
      id: 'lounge_area',
      sceneId,
      type: 'lounge',
      name: '休息区',
      bounds: { x: 6, y: 6, width: 18, height: 12 },
      tags: ['低压力', '适合闲聊'],
      socialMeaning: '适合自然寒暄、低压力交流和短暂停留。',
    },
    {
      id: 'presentation_area',
      sceneId,
      type: 'presentation',
      name: '发布台附近',
      bounds: { x: 30, y: 8, width: 18, height: 10 },
      tags: ['正式', '适合提问'],
      socialMeaning: '适合观察展示、提出问题和围绕任务推进讨论。',
    },
    {
      id: 'quiet_corner',
      sceneId,
      type: 'quiet_corner',
      name: '安静角落',
      bounds: { x: 48, y: 28, width: 10, height: 10 },
      tags: ['低压力', '不宜打扰'],
      socialMeaning: '适合独处、整理想法或等待，不适合贸然打断别人。',
    },
  ];
}

export function createDemoSemanticObjects(sceneId: string): SemanticObject[] {
  return [
    {
      id: 'drink_table',
      sceneId,
      type: 'table',
      name: '饮料桌',
      position: { x: 14, y: 10 },
      footprint: [{ x: 14, y: 10 }],
      blocking: false,
      interactable: true,
      affordances: ['casual_chat', 'wait'],
      tags: ['低压力', '适合闲聊'],
      description: '摆放饮料和点心的小桌，适合作为自然开场话题。',
    },
    {
      id: 'sofa',
      sceneId,
      type: 'sofa',
      name: '沙发',
      position: { x: 9, y: 12 },
      footprint: [{ x: 9, y: 12 }],
      blocking: false,
      interactable: true,
      affordances: ['rest', 'casual_chat'],
      tags: ['低压力', '适合闲聊'],
      description: '休息区沙发，适合坐下、等待或轻松交谈。',
    },
    {
      id: 'presentation_stage',
      sceneId,
      type: 'stage',
      name: '发布台',
      position: { x: 36, y: 11 },
      footprint: [{ x: 36, y: 11 }],
      blocking: false,
      interactable: true,
      affordances: ['observe', 'ask_question'],
      tags: ['正式', '适合提问'],
      description: '展示和说明方案的位置，适合观察或提出任务相关问题。',
    },
    {
      id: 'quiet_corner_board',
      sceneId,
      type: 'board',
      name: '安静角落展示板',
      position: { x: 52, y: 32 },
      footprint: [{ x: 52, y: 32 }],
      blocking: false,
      interactable: true,
      affordances: ['observe', 'wait', 'avoid_disturbing'],
      tags: ['不宜打扰'],
      description: '适合独自查看信息，不适合直接打断正在沉思的人。',
    },
  ];
}
