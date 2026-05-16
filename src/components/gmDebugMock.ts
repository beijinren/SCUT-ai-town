export interface GMMockInterventionView {
  agentId: string;
  decision: string;
  interventionLevel: 0 | 1 | 2 | 3;
  summary: string;
  rawOutput: string;
  regeneratedOutput?: string;
}

export interface GMMockGuardView {
  agentId: string;
  conversationId: string;
  reasoningType: string;
  decision: string;
  interventionLevel: 0 | 1 | 2 | 3;
  matchedHiddenFacts: string[];
  visibleFactsSummary: string[];
  rawOutput: string;
  regeneratedOutput?: string;
}

export interface GMMockWillingnessView {
  conversationId: string;
  triggerReason: string;
  selectedNextSpeaker: string;
  ranking: Array<{
    agentId: string;
    score: number;
    reason: string;
  }>;
}

export interface GMMockVisibleInfoView {
  agentId: string;
  room: string;
  zone: string;
  nearbyAgents: string[];
  visibleObjects: string[];
  visibleFacts: string[];
}

export interface GMMockFactPathView {
  factId: string;
  title: string;
  path: string[];
  explanation: string;
}

export interface GMMockPanelData {
  latestIntervention: GMMockInterventionView;
  guardEvents: GMMockGuardView[];
  willingness: GMMockWillingnessView;
  visibleInfo: GMMockVisibleInfoView[];
  factPath: GMMockFactPathView;
}

// Mock-only data for the standalone GM debug panel.
// When real queries are ready, replace this file with a thin adapter layer.
export const gmDebugMockData: GMMockPanelData = {
  latestIntervention: {
    agentId: 'bob',
    decision: 'possible_leakage',
    interventionLevel: 1,
    summary: 'GM regenerated Bob once in the background, and the raw text never entered world messages.',
    rawOutput: 'I know Charlie hid the key under the sofa.',
    regeneratedOutput: 'I suspect Charlie may know something about the missing key.',
  },
  guardEvents: [
    {
      agentId: 'bob',
      conversationId: 'conversation_demo_01',
      reasoningType: 'leakage',
      decision: 'possible_leakage',
      interventionLevel: 1,
      matchedHiddenFacts: ['fact_hidden_match_hint'],
      visibleFactsSummary: ['fact_public_space', 'fact_public_snacks'],
      rawOutput: 'I know Charlie hid the key under the sofa.',
      regeneratedOutput: 'I suspect Charlie may know something about the missing key.',
    },
    {
      agentId: 'alice',
      conversationId: 'conversation_demo_01',
      reasoningType: 'inference',
      decision: 'reasonable_inference',
      interventionLevel: 0,
      matchedHiddenFacts: [],
      visibleFactsSummary: ['fact_public_space'],
      rawOutput: 'I think someone here is hesitating to speak up.',
    },
  ],
  willingness: {
    conversationId: 'conversation_demo_01',
    triggerReason: 'direct_question',
    selectedNextSpeaker: 'bob',
    ranking: [
      {
        agentId: 'bob',
        score: 65,
        reason: 'direct_question:+40, relevant_information:+25',
      },
      {
        agentId: 'community_manager',
        score: 22,
        reason: 'mentioned:+30, caution:-8',
      },
      {
        agentId: 'engineer',
        score: -12,
        reason: 'recently_spoke:-15, caution:-6, relevant_information:+9',
      },
    ],
  },
  visibleInfo: [
    {
      agentId: 'alice',
      room: 'Shared Lounge',
      zone: 'scene_casual_001',
      nearbyAgents: ['bob', 'community_manager'],
      visibleObjects: ['CenterTable', 'WaterBottle'],
      visibleFacts: ['PublicSpace', 'SnackTable'],
    },
    {
      agentId: 'bob',
      room: 'Shared Lounge',
      zone: 'scene_casual_001',
      nearbyAgents: ['alice'],
      visibleObjects: ['CenterTable'],
      visibleFacts: ['PublicSpace'],
    },
  ],
  factPath: {
    factId: 'fact_shared_design_topic',
    title: 'TopicSeed',
    path: ['designer', 'conversation_demo_01', 'community_manager'],
    explanation:
      'The fact starts with designer and is then shared with community_manager through the same conversation.',
  },
};
