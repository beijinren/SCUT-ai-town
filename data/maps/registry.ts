import * as interviewRoom from './generated/interviewRoom';

export const DEFAULT_MAP_ID = 'interview_room';

export const mapRegistry = {
  interview_room: interviewRoom,
};

export type MapId = keyof typeof mapRegistry;
export type MapModule = (typeof mapRegistry)[MapId];

export function getMapById(mapId: MapId): MapModule {
  return mapRegistry[mapId];
}
