import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { WorldMap, serializedWorldMap } from "./worldMap";
import { GameId, agentId, conversationId, playerId } from "./ids";
import {
  continueConversationMessage,
  leaveConversationMessage,
  startConversationMessage,
} from "../agent/conversation";
import { assertNever } from "../util/assertNever";
import { serializedAgent } from "./agent";
import {
  ACTIVITIES,
  ACTIVITY_COOLDOWN,
  CONVERSATION_COOLDOWN,
} from "../constants";
import { api, internal } from "../_generated/api";
import { sleep } from "../util/sleep";
import { serializedPlayer } from "./player";
import { demoMode } from "./demoMode";
import { serializedSceneWorldSeed } from "./world";
import {
  decideInteractionTiming,
  InteractionTargetCandidate,
} from "./interactionTiming";
import {
  buildSemanticActionCandidates,
  buildSemanticEnvironmentContext,
} from './semanticEnvironment';
import {
  generateThought,
} from "../agent/thoughtGenerator";

const selfInternal = internal.agent.conversation;

function uniquePlayersFromCandidates(
  player: { id: string },
  interactionCandidates: InteractionTargetCandidate[],
) {
  const byId = new Map<string, InteractionTargetCandidate['player']>();
  for (const candidate of interactionCandidates) {
    if (candidate.player.id === player.id) {
      continue;
    }
    byId.set(candidate.player.id, candidate.player);
  }
  return [...byId.values()];
}

export const agentRememberConversation = internalAction({
  args: {
    worldId: v.id("worlds"),
    playerId,
    agentId,
    conversationId,
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: "finishRememberConversation",
      args: {
        agentId: args.agentId,
        operationId: args.operationId,
      },
    });
  },
});

export const agentGenerateMessage = internalAction({
  args: {
    worldId: v.id("worlds"),
    playerId,
    agentId,
    conversationId,
    otherPlayerId: playerId,
    operationId: v.string(),
    type: v.union(
      v.literal("start"),
      v.literal("continue"),
      v.literal("leave"),
    ),
    messageUuid: v.string(),
  },
  handler: async (ctx, args) => {
    let completionFn;
    switch (args.type) {
      case "start":
        completionFn = startConversationMessage;
        break;
      case "continue":
        completionFn = continueConversationMessage;
        break;
      case "leave":
        completionFn = leaveConversationMessage;
        break;
      default:
        assertNever(args.type);
    }

    const promptData = await ctx.runQuery(selfInternal.queryPromptData, {
      worldId: args.worldId,
      playerId: args.playerId,
      otherPlayerId: args.otherPlayerId as GameId<"players">,
      conversationId: args.conversationId as GameId<"conversations">,
    });

    const thought =
      (await generateThought(
        ctx,
        args.worldId,
        args.playerId as GameId<"players">,
        args.otherPlayerId as GameId<"players">,
        promptData.player.name,
        promptData.otherPlayer.name,
        promptData.agent.identity,
      )) ?? undefined;

    const text = await completionFn(
      ctx,
      args.worldId,
      args.conversationId as GameId<"conversations">,
      args.playerId as GameId<"players">,
      args.otherPlayerId as GameId<"players">,
      thought,
    );

    await ctx.runMutation(internal.aiTown.agent.agentSendMessage, {
      worldId: args.worldId,
      conversationId: args.conversationId,
      agentId: args.agentId,
      playerId: args.playerId,
      text,
      thought,
      messageUuid: args.messageUuid,
      leaveConversation: args.type === "leave",
      operationId: args.operationId,
    });
  },
});

export const agentDoSomething = internalAction({
  args: {
    worldId: v.id("worlds"),
    player: v.object(serializedPlayer),
    agent: v.object(serializedAgent),
    map: v.object(serializedWorldMap),
    otherFreePlayers: v.array(v.object(serializedPlayer)),
    joinableConversationTargets: v.array(
      v.object({
        player: v.object(serializedPlayer),
        source: v.union(
          v.literal("free_player"),
          v.literal("active_conversation"),
        ),
        conversationId: v.optional(v.string()),
        participantCount: v.optional(v.number()),
      }),
    ),
    sceneState: v.optional(v.object(serializedSceneWorldSeed)),
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { player, agent } = args;
    const map = new WorldMap(args.map);
    const now = Date.now();
    // Don't try to start a new conversation if we were just in one.
    const justLeftConversation =
      agent.lastConversation &&
      now < agent.lastConversation + CONVERSATION_COOLDOWN;
    // Don't try again if we recently tried to find someone to invite.
    const recentlyAttemptedInvite =
      agent.lastInviteAttempt &&
      now < agent.lastInviteAttempt + CONVERSATION_COOLDOWN;
    const recentActivity =
      player.activity && now < player.activity.until + ACTIVITY_COOLDOWN;
    const interactionCandidates: InteractionTargetCandidate[] = [
      ...args.otherFreePlayers.map((otherPlayer) => ({
        player: otherPlayer,
        source: "free_player" as const,
      })),
      ...args.joinableConversationTargets,
    ];
    const knownPlayers = uniquePlayersFromCandidates(player, interactionCandidates);
    const semanticContext = buildSemanticEnvironmentContext({
      map,
      player: args.player,
      knownPlayers,
    });
    const semanticActionCandidates = buildSemanticActionCandidates({
      map,
      player: args.player,
      knownPlayers,
      interactionCandidates,
      environmentContext: semanticContext,
    });
    const decision = decideInteractionTiming({
      player: args.player,
      interactionCandidates,
      sceneState: args.sceneState,
      justLeftConversation: Boolean(justLeftConversation),
      recentlyAttemptedInvite: Boolean(recentlyAttemptedInvite),
      doingActivity: Boolean(player.activity && player.activity.until > now),
      semanticContext,
      semanticActionCandidates,
    });
    const interactionDecision = {
      timestamp: now,
      shouldInitiate: decision.shouldInitiate,
      selectedPlayerId: decision.selectedPlayerId,
      summary: decision.summary,
      reasons: decision.reasons.map((reason) => reason.message),
      topCandidateScores: decision.candidateScores
        .slice(0, 3)
        .map((candidate) => ({
          playerId: candidate.playerId,
          score: candidate.score,
        })),
      semanticContext,
      semanticActionCandidates: semanticActionCandidates.slice(0, 5),
      chosenSemanticAction: decision.chosenSemanticAction,
    };
    const invitee =
      demoMode.disableAgentConversations || !decision.shouldInitiate
        ? undefined
        : decision.selectedPlayerId;

    let destination;
    let activity;
    if (!invitee) {
      const chosenSemanticAction = decision.chosenSemanticAction;
      if (
        chosenSemanticAction &&
        chosenSemanticAction.destination &&
        (chosenSemanticAction.kind === 'move_to_object' ||
          chosenSemanticAction.kind === 'move_to_area') &&
        chosenSemanticAction.score >= 1.5 &&
        !player.pathfinding
      ) {
        destination = chosenSemanticAction.destination;
      } else if (
        !player.pathfinding &&
        (recentActivity || justLeftConversation || recentlyAttemptedInvite)
      ) {
        destination = wanderDestination(map);
      } else if (!player.pathfinding && !recentActivity) {
        // TODO: have LLM choose the activity & emoji
        const selectedActivity =
          ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
        activity = {
          description: selectedActivity.description,
          emoji: selectedActivity.emoji,
          until: Date.now() + selectedActivity.duration,
        };
      }
    }

    // TODO: We hit a lot of OCC errors on sending inputs in this file. It's
    // easy for them to get scheduled at the same time and line up in time.
    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: "finishDoSomething",
      args: {
        operationId: args.operationId,
        agentId: args.agent.id,
        interactionDecision,
        invitee,
        destination,
        activity,
      },
    });
  },
});

function wanderDestination(worldMap: WorldMap) {
  // Wander someonewhere at least one tile away from the edge.
  return {
    x: 1 + Math.floor(Math.random() * (worldMap.width - 2)),
    y: 1 + Math.floor(Math.random() * (worldMap.height - 2)),
  };
}
