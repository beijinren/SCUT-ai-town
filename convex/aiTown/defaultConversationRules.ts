import { stopPlayer } from './movement';
import { Point } from '../util/types';
import { distance, normalize, vector } from '../util/geometry';
import {
  ConversationActivationResult,
  ConversationRuleSet,
  ConversationStartState,
  SerializedConversationSessionState,
} from './conversationRules';
import { ConversationMembership } from './conversationMembership';
import { GameId, parseGameId } from './ids';
import { getConversationDistance } from './mapRuntimeTuning';

const MAX_CONVERSATION_PARTICIPANTS = 6;

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

function chooseNextParticipant(
  participants: GameId<'players'>[],
  currentPlayerId: GameId<'players'>,
): GameId<'players'> | undefined {
  if (participants.length <= 1) {
    return undefined;
  }
  const index = participants.findIndex((participantId) => participantId === currentPlayerId);
  if (index === -1) {
    return participants[0];
  }
  return participants[(index + 1) % participants.length];
}

function hasReachedConversationCluster(
  player: { position: Point },
  participatingPlayers: Array<{ position: Point }>,
  conversationDistance: number,
) {
  return participatingPlayers.some(
    (otherPlayer) => distance(player.position, otherPlayer.position) < conversationDistance,
  );
}

function orientAroundCentroid(
  participants: Array<{
    player: { position: Point; pathfinding?: unknown; facing: { dx: number; dy: number } };
  }>,
) {
  if (participants.length < 2) {
    return;
  }
  const centroid = participants.reduce(
    (acc, { player }) => ({
      x: acc.x + player.position.x / participants.length,
      y: acc.y + player.position.y / participants.length,
    }),
    { x: 0, y: 0 },
  );
  for (const { player } of participants) {
    const facingVector = normalize(vector(player.position, centroid));
    if (!player.pathfinding && facingVector) {
      player.facing = facingVector;
    }
  }
}

export const defaultConversationRules: ConversationRuleSet = {
  getParticipantLimit() {
    return MAX_CONVERSATION_PARTICIPANTS;
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
    const conversationDistance = getConversationDistance(game.worldMap);
    if (participants.length < 2) {
      return { shouldActivate: false, sessionState };
    }
    const participating = participants.filter(
      ({ membership }) => membership.status.kind === 'participating',
    );
    const walkingOver = participants.filter(({ membership }) => membership.status.kind === 'walkingOver');
    const invited = participants.filter(({ membership }) => membership.status.kind === 'invited');

    if (participating.length === 0) {
      if (invited.length > 0 || walkingOver.length < 2) {
        return { shouldActivate: false, sessionState };
      }
      const [anchor, ...rest] = walkingOver;
      const allNearby = rest.every(
        ({ player }) => distance(anchor.player.position, player.position) < conversationDistance,
      );
      if (!allNearby) {
        return {
          shouldActivate: false,
          sessionState: {
            ...sessionState,
            stage: 'approaching',
          },
        };
      }
      for (const { player, membership } of walkingOver) {
        stopPlayer(player);
        membership.status = { kind: 'participating', started: now };
      }
      return {
        shouldActivate: true,
        sessionState: {
          stage: 'active',
          turnPolicy: sessionState.turnPolicy ?? 'flexible',
          interruptionPolicy: sessionState.interruptionPolicy ?? 'timed',
          currentSpeakerId: sessionState.currentSpeakerId ?? anchor.player.id,
          nextSpeakerId:
            sessionState.nextSpeakerId ??
            chooseNextParticipant(
              walkingOver.map(({ player }) => player.id),
              anchor.player.id,
            ),
          listeningParticipantIds: walkingOver
            .map(({ player }) => player.id)
            .filter((playerId) => playerId !== (sessionState.currentSpeakerId ?? anchor.player.id)),
          currentTurnStreak: sessionState.currentTurnStreak ?? 0,
          maxConsecutiveTurns: sessionState.maxConsecutiveTurns ?? 2,
          interruptAfterMs: sessionState.interruptAfterMs ?? 8_000,
          lastTurnAt: now,
        },
      };
    }

    let joinedAny = false;
    for (const { player, membership } of walkingOver) {
      if (
        hasReachedConversationCluster(
          player,
          participating.map(({ player }) => player),
          conversationDistance,
        )
      ) {
        stopPlayer(player);
        membership.status = { kind: 'participating', started: now };
        joinedAny = true;
      }
    }
    const fallbackSpeaker =
      participating[0]?.player.id ?? participants[0].player.id;
    const currentSpeakerId = sessionState.currentSpeakerId
      ? parseGameId('players', sessionState.currentSpeakerId)
      : fallbackSpeaker;

    return {
      shouldActivate: joinedAny,
      sessionState: {
        ...sessionState,
        stage: 'active',
        turnPolicy: sessionState.turnPolicy ?? 'flexible',
        interruptionPolicy: sessionState.interruptionPolicy ?? 'timed',
        currentSpeakerId,
        nextSpeakerId:
          sessionState.nextSpeakerId ??
          chooseNextParticipant(
            participants.map(({ player }) => player.id),
            currentSpeakerId,
          ),
        listeningParticipantIds: participants
          .map(({ player }) => player.id)
          .filter((playerId) => playerId !== currentSpeakerId),
        currentTurnStreak: sessionState.currentTurnStreak ?? 0,
        maxConsecutiveTurns: sessionState.maxConsecutiveTurns ?? 2,
        interruptAfterMs: sessionState.interruptAfterMs ?? 8_000,
        lastTurnAt: sessionState.lastTurnAt ?? now,
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
        nextSpeakerId: chooseNextParticipant(participants, senderId),
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
    return chooseNextParticipant(
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

  evaluateDepartureOpportunity({
    participants,
    decisionContext,
    joinedAt,
    now,
    numMessages,
    hasMessages,
  }) {
    if (!hasMessages) {
      return {
        shouldLeave: false,
        reason: '会话刚开始，暂不考虑退出。',
      };
    }

    if (participants.length <= 2) {
      return {
        shouldLeave: false,
        reason: '当前只剩两人，退出会直接结束会话，因此暂不主动离开。',
      };
    }

    const timeInConversation = now - joinedAt;
    const { needs, memorySignals } = decisionContext.speaker;
    const fatigueScore =
      needs.listeningPreference +
      memorySignals.preferListening +
      (1 - needs.initiativeNeed) +
      (1 - needs.responseUrgency);

    if (participants.length >= 4 && timeInConversation >= 10_000 && fatigueScore >= 1.9) {
      return {
        shouldLeave: true,
        reason: '当前参与者较多，且你更偏向旁听或低调观察，因此会自然退出，把对话留给其他人继续。',
      };
    }

    if (numMessages >= 8 && timeInConversation >= 15_000 && fatigueScore >= 1.7) {
      return {
        shouldLeave: true,
        reason: '这段对话已经持续了一段时间，而你当前继续留下的动力不强，因此会选择先离开。',
      };
    }

    return {
      shouldLeave: false,
      reason: '当前还没有强到足以主动离开的信号。',
    };
  },
};

export function orientConversationParticipants(
  participants: Array<{ playerId: GameId<'players'>; player: { position: Point; pathfinding?: unknown; facing: { dx: number; dy: number } } }>,
) {
  orientAroundCentroid(participants);
}
