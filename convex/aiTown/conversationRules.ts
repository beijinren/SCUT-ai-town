import { v } from 'convex/values';
import { playerId } from './ids';
import { ObjectType } from 'convex/values';
import { Game } from './game';
import { GameId } from './ids';
import { Player } from './player';
import { ConversationMembership } from './conversationMembership';
import { ConversationDecisionContext } from './conversationDecisionContext';

export const serializedConversationSessionState = {
  stage: v.union(
    v.literal('inviting'),
    v.literal('approaching'),
    v.literal('active'),
  ),
  turnPolicy: v.optional(v.union(v.literal('alternating'), v.literal('flexible'))),
  interruptionPolicy: v.optional(v.union(v.literal('disallowed'), v.literal('timed'))),
  currentSpeakerId: v.optional(playerId),
  nextSpeakerId: v.optional(playerId),
  listeningParticipantIds: v.optional(v.array(playerId)),
  currentTurnStreak: v.optional(v.number()),
  maxConsecutiveTurns: v.optional(v.number()),
  interruptAfterMs: v.optional(v.number()),
  lastTurnAt: v.optional(v.number()),
};
export type SerializedConversationSessionState = ObjectType<
  typeof serializedConversationSessionState
>;

export interface ConversationStartState {
  creatorMembership: ConversationMembership['status'];
  inviteeMembership: ConversationMembership['status'];
  sessionState: SerializedConversationSessionState;
}

export interface ConversationActivationResult {
  shouldActivate: boolean;
  sessionState: SerializedConversationSessionState;
}

export interface ConversationTurnStateUpdate {
  sessionState: SerializedConversationSessionState;
}

export interface SpeakingOpportunity {
  canSpeak: boolean;
  mode: 'start' | 'scheduled' | 'followup' | 'interrupt' | 'wait';
  reason: string;
}

export interface DepartureOpportunity {
  shouldLeave: boolean;
  reason: string;
}

export interface ConversationRuleSet {
  getParticipantLimit(): number;
  buildStartState(args: {
    creatorId: GameId<'players'>;
    inviteeId: GameId<'players'>;
    now: number;
  }): ConversationStartState;
  maybeActivateConversation(args: {
    game: Game;
    now: number;
    participants: Array<{ player: Player; membership: ConversationMembership }>;
    sessionState: SerializedConversationSessionState;
  }): ConversationActivationResult;
  onMessageSent(args: {
    senderId: GameId<'players'>;
    participants: GameId<'players'>[];
    sessionState: SerializedConversationSessionState;
    timestamp: number;
  }): ConversationTurnStateUpdate;
  chooseExpectedSpeaker(args: {
    creatorId: GameId<'players'>;
    participants: GameId<'players'>[];
    sessionState: SerializedConversationSessionState;
    hasMessages: boolean;
  }): GameId<'players'> | undefined;
  evaluateSpeakingOpportunity(args: {
    playerId: GameId<'players'>;
    creatorId: GameId<'players'>;
    participants: GameId<'players'>[];
    sessionState: SerializedConversationSessionState;
    decisionContext: ConversationDecisionContext;
    hasMessages: boolean;
    now: number;
    lastMessageAuthorId?: GameId<'players'>;
    lastMessageTimestamp?: number;
    messageCooldownMs: number;
    awkwardTimeoutMs: number;
  }): SpeakingOpportunity;
  evaluateDepartureOpportunity(args: {
    playerId: GameId<'players'>;
    participants: GameId<'players'>[];
    decisionContext: ConversationDecisionContext;
    joinedAt: number;
    now: number;
    numMessages: number;
    hasMessages: boolean;
  }): DepartureOpportunity;
}
