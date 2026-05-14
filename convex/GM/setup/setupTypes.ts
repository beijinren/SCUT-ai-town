export type PersonaAssignmentStrategy = 'random-unused' | 'fixed';

export type IdentitySlotRef = {
  identitySlotId: string;
  agentId: string;
  displayName: string;
};

export type PersonaTemplate = {
  personaId: string;
  name: string;
  description: string;
  traits?: Record<string, number>;
  speakingStyle?: Record<string, string>;
  thinkingStyle?: {
    defaultFocus?: string[];
    riskPreference?: 'low' | 'medium' | 'high';
  };
  behaviorHints?: string[];
  memoryPreference?: string;
};

export type PersonaAssignment = {
  agentId: string;
  identitySlotId: string;
  displayName: string;
  personaId: string;
};

export type PersonaDealResult = {
  runId: string;
  sceneId: string;
  strategy: PersonaAssignmentStrategy;
  assignmentKey: string;
  assignments: PersonaAssignment[];
  createdAt: number;
};

export type AssignmentHistoryRecord = PersonaDealResult;

export type AssignmentHistoryScene = {
  usedAssignmentKeys: string[];
  runs: AssignmentHistoryRecord[];
};

export type AssignmentHistory = {
  scenes: Record<string, AssignmentHistoryScene>;
};

export type DealPersonasArgs = {
  sceneId: string;
  identitySlots: IdentitySlotRef[];
  personas: PersonaTemplate[];
  history: AssignmentHistory;
  strategy: PersonaAssignmentStrategy;
  seed?: number;
  fixedAssignments?: Record<string, string>;
  allowRepeat?: boolean;
  maxAttempts?: number;
};
