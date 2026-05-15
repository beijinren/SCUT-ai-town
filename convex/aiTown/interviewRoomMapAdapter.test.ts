import {
  bgtiles,
  mapheight,
  mapwidth,
  objmap,
  semanticAreas,
  semanticObjects,
} from '../../data/maps/interview_room/interviewRoomMap';

describe('interview room map adapter', () => {
  test('converts exported map layers into AI Town map shape', () => {
    expect(mapwidth).toBe(25);
    expect(mapheight).toBe(16);

    // bgtiles 包含背景层 + 视觉层；objmap 只保留碰撞层，避免视觉装饰误参与寻路阻挡。
    expect(bgtiles.length).toBeGreaterThanOrEqual(1);
    expect(objmap.length).toBe(1);
    expect(bgtiles[0]).toHaveLength(mapwidth);
    expect(bgtiles[0][0]).toHaveLength(mapheight);
    expect(objmap[0]).toHaveLength(mapwidth);
    expect(objmap[0][0]).toHaveLength(mapheight);
  });

  test('converts exported zones into semantic areas', () => {
    const meetingTable = semanticAreas.find((area) => area.id === 'meeting_table');

    expect(meetingTable).toMatchObject({
      name: 'Meeting Table Area',
      type: 'InterviewRoom',
    });
    expect(meetingTable?.tags).toContain('formal');

    // 原 JSON 使用带 origin 的世界坐标；适配器会转成 AI Town 地图内部坐标。
    expect(meetingTable?.bounds.x).toBe(3);
    expect(meetingTable?.bounds.y).toBe(2);
  });

  test('converts exported objects into semantic objects', () => {
    const table = semanticObjects.find((object) => object.id === 'MeetingTable');
    const document = semanticObjects.find((object) => object.id === 'ResumeDocument');

    expect(table).toMatchObject({
      name: 'Meeting Table',
      type: 'Furniture',
      blocking: true,
      interactable: true,
    });
    expect(table?.affordances).toContain('discuss');

    // 物品坐标同样从 JSON 世界坐标转为 AI Town 地图内部坐标。
    expect(table?.position).toEqual({ x: 13, y: 6 });
    expect(document?.affordances).toContain('read');
  });
});
