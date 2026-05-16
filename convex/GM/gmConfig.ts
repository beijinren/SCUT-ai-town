// Runtime behavior knobs for the GM sidecar.
// Model/API settings live separately in gmModelConfig.ts so GM can use its own model.
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
