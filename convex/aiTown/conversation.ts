import { ObjectType, v } from 'convex/values';
import { GameId, parseGameId } from './ids';
import { conversationId, playerId } from './ids';
import { Player } from './player';
import { inputHandler } from './inputHandler';

import { TYPING_TIMEOUT } from '../constants';
import { Game } from './game';
import { ConversationMembership, serializedConversationMembership } from './conversationMembership';
import { parseMap, serializeMap } from '../util/object';
import { defaultConversationRules, orientConversationParticipants } from './defaultConversationRules';
import {
  serializedConversationSessionState,
  SerializedConversationSessionState,
} from './conversationRules';

export class Conversation {
  id: GameId<'conversations'>;
  creator: GameId<'players'>;
  created: number;
  isTyping?: {
    playerId: GameId<'players'>;
    messageUuid: string;
    since: number;
  };
  lastMessage?: {
    author: GameId<'players'>;
    timestamp: number;
  };
  sessionState: SerializedConversationSessionState;
  numMessages: number;
  participants: Map<GameId<'players'>, ConversationMembership>;

  constructor(serialized: SerializedConversation) {
    const { id, creator, created, isTyping, lastMessage, sessionState, numMessages, participants } =
      serialized;
    this.id = parseGameId('conversations', id);
    this.creator = parseGameId('players', creator);
    this.created = created;
    this.isTyping = isTyping && {
      playerId: parseGameId('players', isTyping.playerId),
      messageUuid: isTyping.messageUuid,
      since: isTyping.since,
    };
    this.lastMessage = lastMessage && {
      author: parseGameId('players', lastMessage.author),
      timestamp: lastMessage.timestamp,
    };
    this.sessionState = {
      ...sessionState,
      currentSpeakerId: sessionState.currentSpeakerId
        ? parseGameId('players', sessionState.currentSpeakerId)
        : undefined,
      nextSpeakerId: sessionState.nextSpeakerId
        ? parseGameId('players', sessionState.nextSpeakerId)
        : undefined,
    };
    this.numMessages = numMessages;
    this.participants = parseMap(participants, ConversationMembership, (m) => m.playerId);
  }

  tick(game: Game, now: number) {
    if (this.isTyping && this.isTyping.since + TYPING_TIMEOUT < now) {
      delete this.isTyping;
    }
    if (this.participants.size !== defaultConversationRules.getParticipantLimit()) {
      console.warn(`Conversation ${this.id} has ${this.participants.size} participants`);
      return;
    }
    const participants = [...this.participants.keys()].map((playerId) => ({
      player: game.world.players.get(playerId)!,
      membership: this.participants.get(playerId)!,
    }));

    const activation = defaultConversationRules.maybeActivateConversation({
      game,
      now,
      participants,
      sessionState: this.sessionState,
    });
    this.sessionState = activation.sessionState;

    if (this.sessionState.stage === 'active') {
      orientConversationParticipants(
        participants.map(({ player, membership }) => ({
          playerId: membership.playerId,
          player,
        })),
      );
    }
  }

  static start(game: Game, now: number, player: Player, invitee: Player) {
    if (player.id === invitee.id) {
      throw new Error(`Can't invite yourself to a conversation`);
    }
    // Ensure the players still exist.
    if ([...game.world.conversations.values()].find((c) => c.participants.has(player.id))) {
      const reason = `Player ${player.id} is already in a conversation`;
      console.log(reason);
      return { error: reason };
    }
    if ([...game.world.conversations.values()].find((c) => c.participants.has(invitee.id))) {
      const reason = `Player ${player.id} is already in a conversation`;
      console.log(reason);
      return { error: reason };
    }
    const conversationId = game.allocId('conversations');
    console.log(`Creating conversation ${conversationId}`);
    const startState = defaultConversationRules.buildStartState({
      creatorId: player.id,
      inviteeId: invitee.id,
      now,
    });
    game.world.conversations.set(
      conversationId,
      new Conversation({
        id: conversationId,
        created: now,
        creator: player.id,
        sessionState: startState.sessionState,
        numMessages: 0,
        participants: [
          { playerId: player.id, invited: now, status: startState.creatorMembership },
          { playerId: invitee.id, invited: now, status: startState.inviteeMembership },
        ],
      }),
    );
    return { conversationId };
  }

  setIsTyping(now: number, player: Player, messageUuid: string) {
    if (this.isTyping) {
      if (this.isTyping.playerId !== player.id) {
        throw new Error(`Player ${this.isTyping.playerId} is already typing in ${this.id}`);
      }
      return;
    }
    this.isTyping = { playerId: player.id, messageUuid, since: now };
  }

  acceptInvite(game: Game, player: Player) {
    const member = this.participants.get(player.id);
    if (!member) {
      throw new Error(`Player ${player.id} not in conversation ${this.id}`);
    }
    if (member.status.kind !== 'invited') {
      throw new Error(
        `Invalid membership status for ${player.id}:${this.id}: ${JSON.stringify(member)}`,
      );
    }
    member.status = { kind: 'walkingOver' };
  }

  rejectInvite(game: Game, now: number, player: Player) {
    const member = this.participants.get(player.id);
    if (!member) {
      throw new Error(`Player ${player.id} not in conversation ${this.id}`);
    }
    if (member.status.kind !== 'invited') {
      throw new Error(
        `Rejecting invite in wrong membership state: ${this.id}:${player.id}: ${JSON.stringify(
          member,
        )}`,
      );
    }
    this.stop(game, now);
  }

  stop(game: Game, now: number) {
    delete this.isTyping;
    for (const [playerId, member] of this.participants.entries()) {
      const agent = [...game.world.agents.values()].find((a) => a.playerId === playerId);
      if (agent) {
        agent.lastConversation = now;
        agent.toRemember = this.id;
      }
    }
    game.world.conversations.delete(this.id);
  }

  leave(game: Game, now: number, player: Player) {
    const member = this.participants.get(player.id);
    if (!member) {
      throw new Error(`Couldn't find membership for ${this.id}:${player.id}`);
    }
    this.stop(game, now);
  }

  serialize(): SerializedConversation {
    const { id, creator, created, isTyping, lastMessage, sessionState, numMessages } = this;
    return {
      id,
      creator,
      created,
      isTyping,
      lastMessage,
      sessionState,
      numMessages,
      participants: serializeMap(this.participants),
    };
  }
}

export const serializedConversation = {
  id: conversationId,
  creator: playerId,
  created: v.number(),
  isTyping: v.optional(
    v.object({
      playerId,
      messageUuid: v.string(),
      since: v.number(),
    }),
  ),
  lastMessage: v.optional(
    v.object({
      author: playerId,
      timestamp: v.number(),
    }),
  ),
  sessionState: v.object(serializedConversationSessionState),
  numMessages: v.number(),
  participants: v.array(v.object(serializedConversationMembership)),
};
export type SerializedConversation = ObjectType<typeof serializedConversation>;

export const conversationInputs = {
  // Start a conversation, inviting the specified player.
  // Conversations can only have two participants for now,
  // so we don't have a separate "invite" input.
  startConversation: inputHandler({
    args: {
      playerId,
      invitee: playerId,
    },
    handler: (game: Game, now: number, args): GameId<'conversations'> => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID: ${playerId}`);
      }
      const inviteeId = parseGameId('players', args.invitee);
      const invitee = game.world.players.get(inviteeId);
      if (!invitee) {
        throw new Error(`Invalid player ID: ${inviteeId}`);
      }
      console.log(`Starting ${playerId} ${inviteeId}...`);
      const { conversationId, error } = Conversation.start(game, now, player, invitee);
      if (!conversationId) {
        // TODO: pass it back to the client for them to show an error.
        throw new Error(error);
      }
      return conversationId;
    },
  }),

  startTyping: inputHandler({
    args: {
      playerId,
      conversationId,
      messageUuid: v.string(),
    },
    handler: (game: Game, now: number, args): null => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID: ${playerId}`);
      }
      const conversationId = parseGameId('conversations', args.conversationId);
      const conversation = game.world.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Invalid conversation ID: ${conversationId}`);
      }
      if (conversation.isTyping && conversation.isTyping.playerId !== playerId) {
        throw new Error(
          `Player ${conversation.isTyping.playerId} is already typing in ${conversationId}`,
        );
      }
      conversation.isTyping = { playerId, messageUuid: args.messageUuid, since: now };
      return null;
    },
  }),

  finishSendingMessage: inputHandler({
    args: {
      playerId,
      conversationId,
      timestamp: v.number(),
    },
    handler: (game: Game, now: number, args): null => {
      const playerId = parseGameId('players', args.playerId);
      const conversationId = parseGameId('conversations', args.conversationId);
      const conversation = game.world.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Invalid conversation ID: ${conversationId}`);
      }
      if (conversation.isTyping && conversation.isTyping.playerId === playerId) {
        delete conversation.isTyping;
      }
      conversation.lastMessage = { author: playerId, timestamp: args.timestamp };
      conversation.numMessages++;
      conversation.sessionState = defaultConversationRules.onMessageSent({
        senderId: playerId,
        participants: [...conversation.participants.keys()],
        sessionState: conversation.sessionState,
        timestamp: args.timestamp,
      }).sessionState;
      return null;
    },
  }),

  // Accept an invite to a conversation, which puts the
  // player in the "walkingOver" state until they're close
  // enough to the other participant.
  acceptInvite: inputHandler({
    args: {
      playerId,
      conversationId,
    },
    handler: (game: Game, now: number, args): null => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }
      const conversationId = parseGameId('conversations', args.conversationId);
      const conversation = game.world.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Invalid conversation ID ${conversationId}`);
      }
      conversation.acceptInvite(game, player);
      return null;
    },
  }),

  // Reject the invite. Eventually we might add a message
  // that explains why!
  rejectInvite: inputHandler({
    args: {
      playerId,
      conversationId,
    },
    handler: (game: Game, now: number, args): null => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }
      const conversationId = parseGameId('conversations', args.conversationId);
      const conversation = game.world.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Invalid conversation ID ${conversationId}`);
      }
      conversation.rejectInvite(game, now, player);
      return null;
    },
  }),
  // Leave a conversation.
  leaveConversation: inputHandler({
    args: {
      playerId,
      conversationId,
    },
    handler: (game: Game, now: number, args): null => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }
      const conversationId = parseGameId('conversations', args.conversationId);
      const conversation = game.world.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Invalid conversation ID ${conversationId}`);
      }
      conversation.leave(game, now, player);
      return null;
    },
  }),
};
