import { GMRuntimeContext, GMSceneGraphNode } from '../gmTypes';

export type GMSceneGraph = Map<string, GMSceneGraphNode>;

function cloneNode(node: GMSceneGraphNode): GMSceneGraphNode {
  return {
    ...node,
    children: [...node.children],
    metadata: node.metadata ? { ...node.metadata } : undefined,
  };
}

function linkChild(graph: GMSceneGraph, parentId: string, childId: string) {
  const parent = graph.get(parentId);
  if (!parent) {
    return;
  }
  if (!parent.children.includes(childId)) {
    parent.children.push(childId);
  }
}

/**
 * Demo tree used by tests and by the first GM iterations before real scene data is wired in.
 */
export function createDemoSceneGraph(): GMSceneGraph {
  const nodes: GMSceneGraph = new Map();
  const seed: GMSceneGraphNode[] = [
    { id: 'scene', name: 'DemoScene', kind: 'scene', children: ['MeetingRoom', 'Cafe'] },
    { id: 'MeetingRoom', name: 'MeetingRoom', kind: 'room', parentId: 'scene', children: ['CenterTable', 'Chairs', 'Door', 'Whiteboard'] },
    { id: 'Cafe', name: 'Cafe', kind: 'room', parentId: 'scene', children: ['Counter'] },
    { id: 'CenterTable', name: 'CenterTable', kind: 'object', parentId: 'MeetingRoom', children: ['Document_A', 'WaterBottle'] },
    { id: 'Chairs', name: 'Chairs', kind: 'object', parentId: 'MeetingRoom', children: ['Chair_1'] },
    { id: 'Door', name: 'Door', kind: 'object', parentId: 'MeetingRoom', children: [] },
    { id: 'Whiteboard', name: 'Whiteboard', kind: 'object', parentId: 'MeetingRoom', children: [] },
    { id: 'Counter', name: 'Counter', kind: 'object', parentId: 'Cafe', children: [] },
    { id: 'Document_A', name: 'Document_A', kind: 'subObject', parentId: 'CenterTable', children: [] },
    { id: 'WaterBottle', name: 'WaterBottle', kind: 'subObject', parentId: 'CenterTable', children: [] },
    { id: 'Chair_1', name: 'Chair_1', kind: 'subObject', parentId: 'Chairs', children: [] },
  ];
  for (const node of seed) {
    nodes.set(node.id, cloneNode(node));
  }
  return nodes;
}

export function buildSceneGraph(context: GMRuntimeContext): GMSceneGraph {
  const sceneId = context.sceneId ?? 'scene';
  const sceneName = context.sceneTitle ?? 'Scene';
  const graph: GMSceneGraph = new Map();
  graph.set(sceneId, { id: sceneId, name: sceneName, kind: 'scene', children: [] });

  const roomIds = [...new Set(context.zones.map((zone) => zone.roomId))];
  for (const roomId of roomIds) {
    graph.set(roomId, { id: roomId, name: roomId, kind: 'room', parentId: sceneId, children: [] });
    linkChild(graph, sceneId, roomId);
  }

  for (const zone of context.zones) {
    graph.set(zone.id, {
      id: zone.id,
      name: zone.name,
      kind: 'zone',
      parentId: zone.roomId,
      children: [],
    });
    linkChild(graph, zone.roomId, zone.id);
  }

  for (const object of context.objects) {
    const parentId = object.parentObjectId ?? object.zoneId ?? object.roomId ?? sceneId;
    graph.set(object.id, {
      id: object.id,
      name: object.name,
      kind: object.parentObjectId ? 'subObject' : 'object',
      parentId,
      children: [],
      metadata: { interactive: Boolean(object.interactive) },
    });
    linkChild(graph, parentId, object.id);
  }

  return graph;
}

export function findNodeById(graph: GMSceneGraph, nodeId: string) {
  return graph.get(nodeId) ?? null;
}

export function getChildren(graph: GMSceneGraph, nodeId: string) {
  const node = graph.get(nodeId);
  if (!node) {
    return [];
  }
  return node.children.map((childId) => graph.get(childId)).filter((node): node is GMSceneGraphNode => Boolean(node));
}

export function getParent(graph: GMSceneGraph, nodeId: string) {
  const node = graph.get(nodeId);
  if (!node?.parentId) {
    return null;
  }
  return graph.get(node.parentId) ?? null;
}

export function getPathToRoot(graph: GMSceneGraph, nodeId: string) {
  const path: GMSceneGraphNode[] = [];
  let current = graph.get(nodeId) ?? null;
  while (current) {
    path.unshift(current);
    current = current.parentId ? graph.get(current.parentId) ?? null : null;
  }
  return path;
}

export function describeNode(graph: GMSceneGraph, nodeId: string) {
  const path = getPathToRoot(graph, nodeId).map((node) => node.name);
  if (path.length === 0) {
    return `Unknown node: ${nodeId}`;
  }
  return `${path.at(-1)} is under ${path.slice(0, -1).join('/') || 'root'}.`;
}
