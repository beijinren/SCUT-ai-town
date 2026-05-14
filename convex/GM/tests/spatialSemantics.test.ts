import {
  buildSemanticLocation,
  buildSpatialSummaryForAgent,
} from '../spatial/spatialSemantics';
import {
  createDemoSceneGraph,
  describeNode,
  findNodeById,
  getParent,
  getPathToRoot,
} from '../spatial/sceneGraph';
import { resolveNearbyObjects } from '../spatial/objectResolver';
import { resolveZone } from '../spatial/zoneResolver';
import { GMRuntimeContext } from '../gmTypes';

function makeContext(): GMRuntimeContext {
  return {
    worldId: 'w1',
    sceneId: 'scene-1',
    sceneTitle: 'Demo Scene',
    actors: [
      { agentId: 'alice', name: 'Alice', position: { x: 2, y: 2 } },
      { agentId: 'bob', name: 'Bob', position: { x: 7, y: 7 } },
    ],
    zones: [
      {
        id: 'meeting-zone',
        name: 'MeetingZone',
        roomId: 'MeetingRoom',
        bounds: { minX: 0, minY: 0, maxX: 4, maxY: 4 },
      },
      {
        id: 'hall-zone',
        name: 'HallZone',
        roomId: 'Hall',
        bounds: { minX: 5, minY: 5, maxX: 9, maxY: 9 },
      },
    ],
    objects: [
      { id: 'table', name: 'CenterTable', position: { x: 2, y: 3 }, roomId: 'MeetingRoom', interactive: true },
      { id: 'document', name: 'Document_A', position: { x: 2, y: 3 }, roomId: 'MeetingRoom', parentObjectId: 'table' },
    ],
    facts: [],
    messages: [],
    conversations: [],
  };
}

describe('spatial semantics', () => {
  it('builds the demo scene tree helpers', () => {
    const graph = createDemoSceneGraph();
    expect(findNodeById(graph, 'Document_A')?.name).toBe('Document_A');
    expect(getParent(graph, 'Document_A')?.name).toBe('CenterTable');
    expect(getPathToRoot(graph, 'Document_A').map((node) => node.name)).toEqual([
      'DemoScene',
      'MeetingRoom',
      'CenterTable',
      'Document_A',
    ]);
    expect(describeNode(graph, 'Document_A')).toContain('CenterTable');
  });

  it('maps coordinates into a room and zone', () => {
    const semantic = buildSemanticLocation(makeContext(), 'alice');
    expect(semantic.roomId).toBe('MeetingRoom');
    expect(semantic.zoneId).toBe('meeting-zone');
  });

  it('returns unknown for unmapped coordinates', () => {
    const resolved = resolveZone({ x: 99, y: 99 }, makeContext().zones);
    expect(resolved.reason).toBe('unknown');
    expect(resolved.roomId).toBe('UnknownRoom');
  });

  it('detects nearby and interactive objects', () => {
    const semantic = buildSemanticLocation(makeContext(), 'alice');
    expect(semantic.nearbyObjectIds).toContain('table');
    expect(semantic.interactiveObjectIds).toContain('table');
  });

  it('resolves descendant objects from semantic containment', () => {
    const graph = createDemoSceneGraph();
    const result = resolveNearbyObjects({
      semanticLocation: {
        actorId: 'alice',
        roomId: 'MeetingRoom',
        roomName: 'MeetingRoom',
        zoneId: 'meeting-zone',
        zoneName: 'MeetingZone',
        nearbyObjectIds: [],
        interactiveObjectIds: [],
      },
      objects: [
        { id: 'table', name: 'CenterTable', roomId: 'MeetingRoom', interactive: true },
        { id: 'document', name: 'Document_A', roomId: 'MeetingRoom', parentObjectId: 'table' },
        { id: 'water', name: 'WaterBottle', roomId: 'MeetingRoom', parentObjectId: 'table' },
      ],
      sceneGraph: graph,
    });
    expect(result.nearbyObjects.map((object) => object.name)).toEqual(
      expect.arrayContaining(['CenterTable', 'Document_A', 'WaterBottle']),
    );
  });

  it('builds a spatial summary string', () => {
    const summary = buildSpatialSummaryForAgent(makeContext(), 'alice');
    expect(summary).toContain('Alice is in MeetingRoom.');
    expect(summary).toContain('CenterTable');
  });
});
