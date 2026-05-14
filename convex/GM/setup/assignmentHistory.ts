import { AssignmentHistory, AssignmentHistoryRecord, PersonaAssignment } from './setupTypes';

export function createEmptyAssignmentHistory(): AssignmentHistory {
  return { scenes: {} };
}

export function buildAssignmentKey(assignments: PersonaAssignment[]): string {
  return assignments
    .map((assignment) => `${assignment.identitySlotId}:${assignment.personaId}`)
    .sort()
    .join('|');
}

export function hasAssignmentBeenUsed(
  history: AssignmentHistory,
  sceneId: string,
  assignmentKey: string,
): boolean {
  return history.scenes[sceneId]?.usedAssignmentKeys.includes(assignmentKey) ?? false;
}

export function recordAssignment(
  history: AssignmentHistory,
  record: AssignmentHistoryRecord,
): AssignmentHistory {
  const existingSceneHistory = history.scenes[record.sceneId] ?? {
    usedAssignmentKeys: [],
    runs: [],
  };

  const usedAssignmentKeys = existingSceneHistory.usedAssignmentKeys.includes(record.assignmentKey)
    ? existingSceneHistory.usedAssignmentKeys
    : [...existingSceneHistory.usedAssignmentKeys, record.assignmentKey];

  return {
    scenes: {
      ...history.scenes,
      [record.sceneId]: {
        usedAssignmentKeys,
        runs: [...existingSceneHistory.runs, record],
      },
    },
  };
}
