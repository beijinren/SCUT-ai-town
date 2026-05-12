export const gmConfig = {
  defaultRoomName: 'UnknownRoom',
  defaultZoneName: 'UnknownZone',
  visibilityDistance: 8,
  hearingDistance: 10,
  interactionDistance: 2,
  sameRoomBonusDistance: 12,
  maxRecentMessagesInObservation: 5,
  maxVisibleFactsInObservation: 12,
  unsupportedHarmlessInterventionLevel: 0 as const,
};

export type GMConfig = typeof gmConfig;
