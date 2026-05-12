import { defaultConversationRules } from './defaultConversationRules';

describe('defaultConversationRules', () => {
  test('创建会话时会生成双人默认进入状态', () => {
    const result = defaultConversationRules.buildStartState({
      creatorId: 'p:1' as any,
      inviteeId: 'p:2' as any,
      now: Date.now(),
    });

    expect(result.creatorMembership.kind).toBe('walkingOver');
    expect(result.inviteeMembership.kind).toBe('invited');
    expect(result.sessionState.stage).toBe('inviting');
    expect(result.sessionState.currentSpeakerId).toBe('p:1');
    expect(result.sessionState.nextSpeakerId).toBe('p:2');
  });

  test('消息发送后会把下一轮发言权切给另一方', () => {
    const result = defaultConversationRules.onMessageSent({
      senderId: 'p:1' as any,
      participants: ['p:1', 'p:2'] as any,
      sessionState: {
        stage: 'active',
        currentSpeakerId: 'p:1' as any,
        nextSpeakerId: 'p:2' as any,
      },
      timestamp: 123,
    });

    expect(result.sessionState.currentSpeakerId).toBe('p:1');
    expect(result.sessionState.nextSpeakerId).toBe('p:2');
    expect(result.sessionState.lastTurnAt).toBe(123);
  });

  test('对方长时间不回应时，当前说话者可以继续补充发言', () => {
    const opportunity = defaultConversationRules.evaluateSpeakingOpportunity({
      playerId: 'p:1' as any,
      creatorId: 'p:1' as any,
      participants: ['p:1', 'p:2'] as any,
      sessionState: {
        stage: 'active',
        turnPolicy: 'flexible',
        interruptionPolicy: 'timed',
        currentSpeakerId: 'p:1' as any,
        nextSpeakerId: 'p:2' as any,
        currentTurnStreak: 1,
        maxConsecutiveTurns: 2,
        interruptAfterMs: 8000,
      },
      decisionContext: {
        speaker: {
          playerId: 'p:1' as any,
          needs: {
            initiativeNeed: 0.7,
            responseUrgency: 0.8,
            interruptionUrgency: 0.4,
            listeningPreference: 0.2,
          },
          memorySignals: {
            topicalRelevance: 0.3,
            unresolvedTension: 0.2,
            rapportConfidence: 0.1,
            preferListening: 0,
          },
        },
        listeners: [],
      },
      hasMessages: true,
      now: 20_000,
      lastMessageAuthorId: 'p:1' as any,
      lastMessageTimestamp: 10_000,
      messageCooldownMs: 2_000,
      awkwardTimeoutMs: 8_000,
    });

    expect(opportunity.canSpeak).toBe(true);
    expect(opportunity.mode).toBe('followup');
  });

  test('超出打断窗口后，监听者可以插话', () => {
    const opportunity = defaultConversationRules.evaluateSpeakingOpportunity({
      playerId: 'p:3' as any,
      creatorId: 'p:1' as any,
      participants: ['p:1', 'p:2', 'p:3'] as any,
      sessionState: {
        stage: 'active',
        turnPolicy: 'flexible',
        interruptionPolicy: 'timed',
        currentSpeakerId: 'p:1' as any,
        nextSpeakerId: 'p:2' as any,
        currentTurnStreak: 1,
        maxConsecutiveTurns: 2,
        interruptAfterMs: 8_000,
        listeningParticipantIds: ['p:2', 'p:3'] as any,
      },
      decisionContext: {
        speaker: {
          playerId: 'p:3' as any,
          needs: {
            initiativeNeed: 0.5,
            responseUrgency: 0.6,
            interruptionUrgency: 0.9,
            listeningPreference: 0.1,
          },
          memorySignals: {
            topicalRelevance: 0.4,
            unresolvedTension: 0.3,
            rapportConfidence: 0,
            preferListening: 0,
          },
        },
        listeners: [],
      },
      hasMessages: true,
      now: 20_000,
      lastMessageAuthorId: 'p:1' as any,
      lastMessageTimestamp: 10_000,
      messageCooldownMs: 2_000,
      awkwardTimeoutMs: 8_000,
    });

    expect(opportunity.canSpeak).toBe(true);
    expect(opportunity.mode).toBe('interrupt');
  });

  test('高 listening 倾向时，不会轻易连续补充发言', () => {
    const opportunity = defaultConversationRules.evaluateSpeakingOpportunity({
      playerId: 'p:1' as any,
      creatorId: 'p:1' as any,
      participants: ['p:1', 'p:2'] as any,
      sessionState: {
        stage: 'active',
        turnPolicy: 'flexible',
        interruptionPolicy: 'timed',
        currentSpeakerId: 'p:1' as any,
        nextSpeakerId: 'p:2' as any,
        currentTurnStreak: 2,
        maxConsecutiveTurns: 2,
        interruptAfterMs: 8_000,
      },
      decisionContext: {
        speaker: {
          playerId: 'p:1' as any,
          needs: {
            initiativeNeed: 0.2,
            responseUrgency: 0.2,
            interruptionUrgency: 0.1,
            listeningPreference: 0.9,
          },
          memorySignals: {
            topicalRelevance: 0,
            unresolvedTension: 0,
            rapportConfidence: 0,
            preferListening: 0.5,
          },
        },
        listeners: [],
      },
      hasMessages: true,
      now: 20_000,
      lastMessageAuthorId: 'p:1' as any,
      lastMessageTimestamp: 10_000,
      messageCooldownMs: 2_000,
      awkwardTimeoutMs: 8_000,
    });

    expect(opportunity.canSpeak).toBe(false);
  });
});
