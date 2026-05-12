import { blocked, movePlayer, stopPlayer } from './movement';
import { Point } from '../util/types';
import { distance, normalize, vector } from '../util/geometry';
import { CONVERSATION_DISTANCE } from '../constants';
import {
  ConversationActivationResult,
  ConversationRuleSet,
  ConversationStartState,
  SerializedConversationSessionState,
} from './conversationRules';
import { ConversationMembership } from './conversationMembership';
import { GameId, parseGameId } from './ids';

function defaultSessionState(): SerializedConversationSessionState {
  return {
    stage: 'inviting',
    turnPolicy: 'flexible',
    interruptionPolicy: 'timed',
    currentTurnStreak: 0,
    maxConsecutiveTurns: 2,
    interruptAfterMs: 8_000,
  };
}

function chooseOtherParticipant(
  participants: GameId<'players'>[],
  senderId: GameId<'players'>,
): GameId<'players'> | undefined {
  return participants.find((participantId) => participantId !== senderId);
}

export const defaultConversationRules: ConversationRuleSet = {
  getParticipantLimit() {
    return 2;
  },

  buildStartState({ creatorId, inviteeId }): ConversationStartState {
    return {
      creatorMembership: { kind: 'walkingOver' },
      inviteeMembership: { kind: 'invited' },
      sessionState: {
        ...defaultSessionState(),
        currentSpeakerId: creatorId,
        nextSpeakerId: inviteeId,
        listeningParticipantIds: [inviteeId],
      },
    };
  },

  maybeActivateConversation({
    game,
    now,
    participants,
    sessionState,
  }): ConversationActivationResult {
    if (participants.length !== 2) {
      return { shouldActivate: false, sessionState };
    }
    const [first, second] = participants;
    const member1 = first.membership;
    const member2 = second.membership;
    const player1 = first.player;
    const player2 = second.player;

    if (!(member1.status.kind === 'walkingOver' && member2.status.kind === 'walkingOver')) {
      return { shouldActivate: false, sessionState };
    }
    const playerDistance = distance(player1.position, player2.position);
    if (playerDistance >= CONVERSATION_DISTANCE) {
      return {
        shouldActivate: false,
        sessionState: {
          ...sessionState,
          stage: 'approaching',
        },
      };
    }

    stopPlayer(player1);
    stopPlayer(player2);
    member1.status = { kind: 'participating', started: now };
    member2.status = { kind: 'participating', started: now };

    const neighbors = (p: Point) => [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ];
    const floorPos1 = { x: Math.floor(player1.position.x), y: Math.floor(player1.position.y) };
    const p1Candidates = neighbors(floorPos1).filter((p) => !blocked(game, now, p, player1.id));
    p1Candidates.sort((a, b) => distance(a, player2.position) - distance(b, player2.position));
    if (p1Candidates.length > 0) {
      const p1Candidate = p1Candidates[0];
      const p2Candidates = neighbors(p1Candidate).filter((p) => !blocked(game, now, p, player2.id));
      p2Candidates.sort((a, b) => distance(a, player2.position) - distance(b, player2.position));
      if (p2Candidates.length > 0) {
        const p2Candidate = p2Candidates[0];
        movePlayer(game, now, player1, p1Candidate, true);
        movePlayer(game, now, player2, p2Candidate, true);
      }
    }

    return {
      shouldActivate: true,
      sessionState: {
        stage: 'active',
        turnPolicy: sessionState.turnPolicy ?? 'flexible',
        interruptionPolicy: sessionState.interruptionPolicy ?? 'timed',
        currentSpeakerId: sessionState.currentSpeakerId ?? player1.id,
        nextSpeakerId: sessionState.nextSpeakerId ?? player2.id,
        listeningParticipantIds: [player2.id],
        currentTurnStreak: sessionState.currentTurnStreak ?? 0,
        maxConsecutiveTurns: sessionState.maxConsecutiveTurns ?? 2,
        interruptAfterMs: sessionState.interruptAfterMs ?? 8_000,
        lastTurnAt: now,
      },
    };
  },

  onMessageSent({ senderId, participants, sessionState, timestamp }) {
    const currentSpeakerId = sessionState.currentSpeakerId
      ? parseGameId('players', sessionState.currentSpeakerId)
      : undefined;
    const currentTurnStreak =
      currentSpeakerId === senderId ? (sessionState.currentTurnStreak ?? 0) + 1 : 1;
    return {
      sessionState: {
        ...sessionState,
        stage: 'active',
        currentSpeakerId: senderId,
        nextSpeakerId: chooseOtherParticipant(participants, senderId),
        listeningParticipantIds: participants.filter((participantId) => participantId !== senderId),
        currentTurnStreak,
        lastTurnAt: timestamp,
      },
    };
  },

  chooseExpectedSpeaker({ creatorId, participants, sessionState, hasMessages }) {
    if (!hasMessages) {
      return sessionState.currentSpeakerId
        ? parseGameId('players', sessionState.currentSpeakerId)
        : creatorId;
    }
    if (sessionState.nextSpeakerId) {
      return parseGameId('players', sessionState.nextSpeakerId);
    }
    return chooseOtherParticipant(
      participants,
      sessionState.currentSpeakerId
        ? parseGameId('players', sessionState.currentSpeakerId)
        : creatorId,
    );
  },

  evaluateSpeakingOpportunity({
    playerId,
    creatorId,
    participants,
    sessionState,
    decisionContext,
    hasMessages,
    now,
    lastMessageAuthorId,
    lastMessageTimestamp,
    messageCooldownMs,
    awkwardTimeoutMs,
  }) {
    const expectedSpeaker = defaultConversationRules.chooseExpectedSpeaker({
      creatorId,
      participants,
      sessionState,
      hasMessages,
    });
    const currentSpeakerId = sessionState.currentSpeakerId
      ? parseGameId('players', sessionState.currentSpeakerId)
      : undefined;
    const currentTurnStreak = sessionState.currentTurnStreak ?? 0;
    const maxConsecutiveTurns = sessionState.maxConsecutiveTurns ?? 2;
    const interruptAfterMs = sessionState.interruptAfterMs ?? 8_000;
    const continueDrive =
      decisionContext.speaker.needs.responseUrgency +
      decisionContext.speaker.memorySignals.topicalRelevance +
      decisionContext.speaker.memorySignals.unresolvedTension -
      decisionContext.speaker.needs.listeningPreference -
      decisionContext.speaker.memorySignals.preferListening;
    const interruptDrive =
      decisionContext.speaker.needs.interruptionUrgency +
      decisionContext.speaker.memorySignals.topicalRelevance +
      decisionContext.speaker.memorySignals.unresolvedTension -
      decisionContext.speaker.memorySignals.preferListening;

    if (!hasMessages) {
      if (expectedSpeaker === playerId) {
        return {
          canSpeak: true,
          mode: 'start',
          reason: '当前规则指定你先开口。',
        };
      }
      return {
        canSpeak: false,
        mode: 'wait',
        reason: '当前先等待指定首发者开口。',
      };
    }

    if (lastMessageTimestamp === undefined) {
      return {
        canSpeak: false,
        mode: 'wait',
        reason: '缺少上一条消息时间，暂不发言。',
      };
    }

    const sinceLastMessage = now - lastMessageTimestamp;
    if (sinceLastMessage < messageCooldownMs) {
      return {
        canSpeak: false,
        mode: 'wait',
        reason: '上一条消息刚发出，先给对方阅读和反应时间。',
      };
    }

    if (expectedSpeaker === playerId) {
      return {
        canSpeak: true,
        mode: 'scheduled',
        reason: '当前轮次轮到你发言，且你的目标与当前发言责任一致。',
      };
    }

    if (
      currentSpeakerId === playerId &&
      currentTurnStreak < maxConsecutiveTurns + (continueDrive >= 0.75 ? 1 : 0) &&
      sinceLastMessage >= awkwardTimeoutMs
    ) {
      return {
        canSpeak: true,
        mode: 'followup',
        reason: '结合你当前的目标和表达需求，对方迟迟没有回应时你可以继续补充发言。',
      };
    }

    if (
      sessionState.interruptionPolicy === 'timed' &&
      lastMessageAuthorId !== playerId &&
      sinceLastMessage >= Math.max(2_000, interruptAfterMs - Math.round(interruptDrive * 2_000))
    ) {
      return {
        canSpeak: true,
        mode: 'interrupt',
        reason: '结合你当前的目的和表达压力，已进入可打断窗口，你可以插话。',
      };
    }

    return {
      canSpeak: false,
      mode: 'wait',
      reason: '当前仍应由他人发言或继续等待。',
    };
  },
};

export function orientConversationParticipants(
  participants: Array<{ playerId: GameId<'players'>; player: { position: Point; pathfinding?: unknown; facing: { dx: number; dy: number } } }>,
) {
  if (participants.length !== 2) {
    return;
  }
  const [first, second] = participants;
  const facingVector = normalize(vector(first.player.position, second.player.position));
  if (!first.player.pathfinding && facingVector) {
    first.player.facing = facingVector;
  }
  if (!second.player.pathfinding && facingVector) {
    second.player.facing.dx = -facingVector.dx;
    second.player.facing.dy = -facingVector.dy;
  }
}
