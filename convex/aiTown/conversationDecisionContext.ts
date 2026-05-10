import { GameId } from './ids';
import { Game } from './game';
import { Conversation } from './conversation';

export interface ConversationNeedProfile {
  initiativeNeed: number;
  responseUrgency: number;
  interruptionUrgency: number;
  listeningPreference: number;
}

export interface ConversationMemorySignals {
  topicalRelevance: number;
  unresolvedTension: number;
  rapportConfidence: number;
  preferListening: number;
}

export interface ConversationParticipantContext {
  playerId: GameId<'players'>;
  name?: string;
  persona?: string;
  purpose?: string;
  needs: ConversationNeedProfile;
  memorySignals: ConversationMemorySignals;
}

export interface ConversationDecisionContext {
  speaker: ConversationParticipantContext;
  listeners: ConversationParticipantContext[];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function inferNeedsFromText(text: string): ConversationNeedProfile {
  let initiativeNeed = 0.45;
  let responseUrgency = 0.45;
  let interruptionUrgency = 0.35;
  let listeningPreference = 0.35;

  const moreInitiative = ['推进', '回应', '验证', '获取', '追问', '带动', '熟悉', '建立联系'];
  const moreListening = ['低调', '观察', '分析', '判断', '避免', '休息', '放松'];
  const moreInterrupting = ['追问', '推进', '控场', '维持', '带动'];

  for (const keyword of moreInitiative) {
    if (text.includes(keyword)) {
      initiativeNeed += 0.1;
      responseUrgency += 0.08;
    }
  }
  for (const keyword of moreListening) {
    if (text.includes(keyword)) {
      listeningPreference += 0.12;
      interruptionUrgency -= 0.06;
    }
  }
  for (const keyword of moreInterrupting) {
    if (text.includes(keyword)) {
      interruptionUrgency += 0.1;
    }
  }

  return {
    initiativeNeed: clampScore(initiativeNeed),
    responseUrgency: clampScore(responseUrgency),
    interruptionUrgency: clampScore(interruptionUrgency),
    listeningPreference: clampScore(listeningPreference),
  };
}

function defaultMemorySignals(): ConversationMemorySignals {
  return {
    topicalRelevance: 0,
    unresolvedTension: 0,
    rapportConfidence: 0,
    preferListening: 0,
  };
}

function buildParticipantContext(game: Game, playerId: GameId<'players'>): ConversationParticipantContext {
  const playerDescription = game.playerDescriptions.get(playerId);
  const agent = [...game.world.agents.values()].find((candidate) => candidate.playerId === playerId);
  const agentDescription = agent ? game.agentDescriptions.get(agent.id) : undefined;
  const purpose = agentDescription?.plan ?? '';
  const persona = agentDescription?.identity ?? playerDescription?.description ?? '';
  const needs = inferNeedsFromText(`${purpose}\n${persona}`);

  return {
    playerId,
    name: playerDescription?.name,
    persona,
    purpose,
    needs,
    memorySignals: defaultMemorySignals(),
  };
}

export function buildConversationDecisionContext(args: {
  game: Game;
  conversation: Conversation;
  playerId: GameId<'players'>;
}): ConversationDecisionContext {
  const { game, conversation, playerId } = args;
  const speaker = buildParticipantContext(game, playerId);
  const listeners = [...conversation.participants.keys()]
    .filter((participantId) => participantId !== playerId)
    .map((participantId) => buildParticipantContext(game, participantId));

  return {
    speaker,
    listeners,
  };
}
