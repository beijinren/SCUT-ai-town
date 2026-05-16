import { distance } from '../../util/geometry';
import { gmConfig } from '../gmConfig';
import { GMRuntimeContext, GMZone, GMZoneResolution } from '../gmTypes';
import { Point } from '../../util/types';

export const demoZones: GMZone[] = [
  {
    id: 'meeting-zone',
    name: 'MeetingRoom',
    roomId: 'MeetingRoom',
    bounds: { minX: 0, minY: 0, maxX: 4, maxY: 4 },
  },
  {
    id: 'cafe-zone',
    name: 'Cafe',
    roomId: 'Cafe',
    bounds: { minX: 5, minY: 0, maxX: 9, maxY: 4 },
  },
];

function isWithinBounds(point: Point, zone: GMZone) {
  if (!zone.bounds) {
    return false;
  }
  return (
    point.x >= zone.bounds.minX &&
    point.x <= zone.bounds.maxX &&
    point.y >= zone.bounds.minY &&
    point.y <= zone.bounds.maxY
  );
}

function matchZone(point: Point, zones: GMZone[]) {
  for (const zone of zones) {
    if (isWithinBounds(point, zone)) {
      return {
        zone,
        confidence: 1,
        reason: 'bounds' as const,
      };
    }
    if (zone.center && zone.radius !== undefined && distance(point, zone.center) <= zone.radius) {
      return {
        zone,
        confidence: Math.max(0.5, 1 - distance(point, zone.center) / zone.radius),
        reason: 'radius' as const,
      };
    }
  }
  return null;
}

/**
 * Resolve raw x/y into a semantic room/zone without changing the original coordinate system.
 */
export function resolveZone(point: Point, zones: GMZone[] = demoZones): GMZoneResolution {
  const matched = matchZone(point, zones);
  if (!matched) {
    return {
      roomId: gmConfig.defaultRoomName,
      roomName: gmConfig.defaultRoomName,
      zoneId: undefined,
      zoneName: undefined,
      confidence: 0,
      reason: 'unknown',
    };
  }
  return {
    roomId: matched.zone.roomId,
    roomName: matched.zone.roomId,
    zoneId: matched.zone.id,
    zoneName: matched.zone.name,
    confidence: matched.confidence,
    reason: matched.reason,
  };
}

export function resolveRoom(point: Point, context: GMRuntimeContext) {
  return resolveZone(point, context.zones);
}
