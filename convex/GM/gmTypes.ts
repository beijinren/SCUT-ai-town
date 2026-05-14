import { Point } from '../util/types';

export type GMInterventionLevel = 0 | 1 | 2 | 3;

export type GMGuardDecision =
  | 'pass'
  | 'reasonable_inference'
  | 'personality_based_guess'
  | 'unsupported_but_harmless'
  | 'possible_leakage'
  | 'clear_leakage'
  | 'physical_impossible';

export type GMFactVisibility = 'public' | 'private' | 'shared' | 'hidden';

export type GMToolKind = 'real_tool' | 'simulated_tool' | 'narrative_only';

export type GMToolOutcomeKind = 'success' | 'failed' | 'unavailable' | 'recorded_only';

export interface GMZone {
  id: string;
  name: string;
  roomId: string;
  center?: Point;
  radius?: number;
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface GMSceneObject {
  id: string;
  name: string;
  kind?: string;
  position?: Point;
  roomId?: string;
  zoneId?: string;
  aliases?: string[];
  interactive?: boolean;
  parentObjectId?: string;
}

export interface GMSceneGraphNode {
  id: string;
  name: string;
  kind: 'scene' | 'room' | 'zone' | 'object' | 'subObject';
  parentId?: string;
  children: string[];
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface GMSemanticLocation {
  actorId: string;
  roomId: string;
  roomName: string;
  zoneId?: string;
  zoneName?: string;
  nearbyObjectIds: string[];
  interactiveObjectIds: string[];
}

export interface GMVisibleFact {
  factId: string;
  title: string;
  content: string;
  visibility: GMFactVisibility;
  source?: string;
}

export interface GMMemoryEvidence {
  memoryId: string;
  factId?: string;
  summary: string;
  confidence?: number;
}

export interface GMFact {
  id: string;
  title: string;
  content: string;
  visibility: GMFactVisibility;
  keywords?: string[];
  roomId?: string;
  zoneId?: string;
  ownerAgentIds?: string[];
  sharedWithAgentIds?: string[];
  knownBy?: string[];
  memoryEvidenceAgentIds?: string[];
  source?: string;
}

export interface GMFactNode {
  factId: string;
  content: string;
  visibility: GMFactVisibility;
  sceneId?: string;
  createdAt?: number;
}

export interface GMActorTraits {
  extroversion?: number;
  caution?: number;
  talkativeness?: number;
  tendencyToSpeculate?: number;
  labels?: string[];
}

export interface GMActor {
  agentId: string;
  playerId?: string;
  name: string;
  position: Point;
  identity?: string;
  publicProfile?: string;
  plan?: string;
  roomId?: string;
  zoneId?: string;
  traits?: GMActorTraits;
}

export interface GMConversationParticipant {
  agentId: string;
  playerId?: string;
}

export interface GMConversationRef {
  conversationId: string;
  participantAgentIds: string[];
}

export interface GMMessage {
  id: string;
  conversationId?: string;
  authorAgentId?: string;
  authorName: string;
  text: string;
  timestamp: number;
  roomId?: string;
  visibility?: 'public' | 'private';
  delivery?: 'normal' | 'whisper';
  targetAgentId?: string;
}

export interface GMObservation {
  agentId: string;
  semanticLocation: GMSemanticLocation;
  visibleAgents: string[];
  visibleObjects: GMSceneObject[];
  visibleFacts: GMVisibleFact[];
  audibleMessages: GMMessage[];
  text: string;
}

export interface GMGuardContext {
  worldId?: string;
  actor: GMActor;
  semanticLocation?: GMSemanticLocation;
  visibleFacts: GMVisibleFact[];
  knownFacts: GMFact[];
  allFacts: GMFact[];
  recentMessages: GMMessage[];
  memoryEvidence?: GMMemoryEvidence[];
  knowledgePaths?: Record<string, string[]>;
  physicallyPresentAgentIds?: string[];
  audibleAgentIds?: string[];
}

export interface GMGuardResult {
  decision: GMGuardDecision;
  interventionLevel: GMInterventionLevel;
  reason: string;
  matchedFactIds: string[];
  visibleFactIds: string[];
  reasoningType:
    | 'observation'
    | 'memory'
    | 'inference'
    | 'personality'
    | 'unsupported'
    | 'leakage'
    | 'physical';
  hasKnownPath?: boolean;
  hasMemoryEvidence?: boolean;
  suggestions?: string[];
}

export interface GMInterventionPlan {
  action: 'pass' | 'regenerate' | 'rewrite_demo' | 'reject_or_rollback';
  level: GMInterventionLevel;
  reason: string;
}

export interface GMRollbackPlan {
  shouldRemoveMessage: boolean;
  shouldSkipMemoryWrite: boolean;
  shouldMarkViolation: boolean;
  shouldWriteMessage: boolean;
  shouldWriteMemory: boolean;
  shouldUpdateWorld: boolean;
  shouldWriteDebug: boolean;
  reason: string;
}

export interface GMRelationEdge {
  fromAgentId: string;
  toAgentId: string;
  interactionCount: number;
  lastInteractionAt?: number;
  sharedEventIds: string[];
  relationSummary: string;
}

export interface GMKnowledgeEdge {
  fromId: string;
  toId: string;
  factId?: string;
  evidence?: string;
}

export interface GMFactEdge {
  factId: string;
  fromAgentId?: string;
  fromEventId?: string;
  toAgentId: string;
  sourceType: 'observation' | 'conversation' | 'memory' | 'system' | 'event';
  evidence?: string;
  createdAt?: number;
}

export interface GMWillingnessFactor {
  label: string;
  delta: number;
  reason: string;
}

/**
 * External scores are expected to come from the teammate-owned agent-side
 * willingness logic. GM consumes them and only handles trigger timing and
 * rare conflict-extension hooks.
 */
export interface GMExternalWillingnessScore {
  agentId: string;
  score: number;
  reason?: string;
  factors?: GMWillingnessFactor[];
  canSpeak?: boolean;
  source?: 'agent_self_score' | 'gm_internal_estimate' | 'manual';
}

export type GMWillingnessTriggerReason =
  | 'first_round'
  | 'new_participant_joined'
  | 'direct_question'
  | 'agent_mentioned'
  | 'new_information'
  | 'topic_changed'
  | 'scene_phase_changed'
  | 'challenged_or_requested'
  | 'manual_refresh';

export interface GMWillingnessScore {
  agentId: string;
  score: number;
  factors: GMWillingnessFactor[];
  reason: string;
  canSpeak: boolean;
}

export interface GMWillingnessConflict {
  type: 'score_tie' | 'ranking_conflict';
  agentIds: string[];
  reason: string;
}

export interface GMWillingnessExtensionRequest {
  conversationId: string;
  triggerReason: GMWillingnessTriggerReason;
  ranking: GMWillingnessScore[];
  conflict: GMWillingnessConflict;
}

export interface GMWillingnessExtensionResult {
  shouldAdjust: boolean;
  adjustedAgentOrder?: string[];
  reason?: string;
}

export interface GMTurnOrderResult {
  ranking: GMWillingnessScore[];
  selectedNextSpeaker?: string;
  triggerReason: GMWillingnessTriggerReason;
  usedExternalScores?: boolean;
  needsGMReview?: boolean;
  conflict?: GMWillingnessConflict;
}

export interface GMWillingnessContext {
  conversationId: string;
  participants: GMActor[];
  currentSpeakerId?: string;
  latestMessage?: GMMessage;
  isFirstRound?: boolean;
  newParticipantJoined?: boolean;
  mentionedAgentIds?: string[];
  directlyAddressedAgentIds?: string[];
  agentsWithNewInformation?: string[];
  challengedAgentIds?: string[];
  requestedResponseAgentIds?: string[];
  topicChanged?: boolean;
  currentTopicId?: string;
  previousTopicId?: string;
  scenePhaseChanged?: boolean;
  heardByAgentIds?: string[];
  relevantFactIdsByAgent?: Record<string, string[]>;
  topicRelevanceByAgent?: Record<string, number>;
  emotionalPressureByAgent?: Record<string, number>;
}

export interface GMRuntimeContext {
  worldId: string;
  sceneId?: string;
  sceneTitle?: string;
  actors: GMActor[];
  zones: GMZone[];
  objects: GMSceneObject[];
  facts: GMFact[];
  messages: GMMessage[];
  conversations?: GMConversationRef[];
}

export interface GMZoneResolution {
  zoneId?: string;
  zoneName?: string;
  roomId: string;
  roomName: string;
  confidence: number;
  reason: 'bounds' | 'radius' | 'unknown';
}
