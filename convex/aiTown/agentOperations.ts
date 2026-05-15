import { v } from 'convex/values';
import { ActionCtx, internalAction } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { WorldMap, serializedWorldMap } from './worldMap';
import { rememberConversation } from '../agent/memory';
import { GameId, agentId, conversationId, playerId } from './ids';
import {
  continueConversationMessage,
  leaveConversationMessage,
  startConversationMessage,
} from '../agent/conversation';
import { assertNever } from '../util/assertNever';
import { serializedAgent } from './agent';
import { ACTIVITIES, ACTIVITY_COOLDOWN, CONVERSATION_COOLDOWN } from '../constants';
import { api, internal } from '../_generated/api';
import { sleep } from '../util/sleep';
import { serializedPlayer } from './player';
import { demoMode } from './demoMode';
import { serializedSceneWorldSeed } from './world';
import { decideInteractionTiming } from './interactionTiming';
import {
  buildInteractionCandidates,
  getEnvironmentContextForPlayer,
  SemanticActionCandidate,
} from './semanticEnvironment';
import { buildGMContextFromSnapshots } from '../GM/runtime/gmContextLoader';
import { guardGeneratedMessage } from '../GM/bridge/conversationGuardBridge';

async function buildGMRuntimeContextForConversation(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
) {
  const [worldState, descriptions, messages] = await Promise.all([
    ctx.runQuery(api.world.worldState, { worldId }),
    ctx.runQuery(api.world.gameDescriptions, { worldId }),
    ctx.runQuery(api.messages.listMessages, { worldId, conversationId }),
  ]);
  return buildGMContextFromSnapshots({
    worldId,
    world: worldState.world,
    descriptions,
    messages,
  });
}

async function sendAgentMessage(
  ctx: ActionCtx,
  args: {
    worldId: Id<'worlds'>;
    conversationId: string;
    agentId: string;
    playerId: string;
    text: string;
    messageUuid: string;
    leaveConversation: boolean;
    operationId: string;
  },
) {
  await ctx.runMutation(internal.aiTown.agent.agentSendMessage, args);
}

async function abortAgentMessage(
  ctx: ActionCtx,
  args: {
    worldId: Id<'worlds'>;
    agentId: string;
    conversationId: string;
    operationId: string;
  },
) {
  /*
   * Use the existing input pipeline for a soft abort so we do not
   * reach into the conversation state machine directly.
   */
  await ctx.runMutation(api.aiTown.main.sendInput, {
    worldId: args.worldId,
    name: 'agentAbortSendingMessage',
    args: {
      agentId: args.agentId,
      conversationId: args.conversationId,
      operationId: args.operationId,
    },
  });
}

export const agentRememberConversation = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    await rememberConversation(
      ctx,
      args.worldId,
      args.agentId as GameId<'agents'>,
      args.playerId as GameId<'players'>,
      args.conversationId as GameId<'conversations'>,
    );
    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'finishRememberConversation',
      args: {
        agentId: args.agentId,
        operationId: args.operationId,
      },
    });
  },
});

export const agentGenerateMessage = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    otherPlayerId: playerId,
    operationId: v.string(),
    type: v.union(v.literal('start'), v.literal('continue'), v.literal('leave')),
    messageUuid: v.string(),
  },
  handler: async (ctx, args) => {
    let completionFn;
    switch (args.type) {
      case 'start':
        completionFn = startConversationMessage;
        break;
      case 'continue':
        completionFn = continueConversationMessage;
        break;
      case 'leave':
        completionFn = leaveConversationMessage;
        break;
      default:
        assertNever(args.type);
    }
    const text = await completionFn(
      ctx,
      args.worldId,
      args.conversationId as GameId<'conversations'>,
      args.playerId as GameId<'players'>,
      args.otherPlayerId as GameId<'players'>,
    );
    const dispatchArgs = {
      worldId: args.worldId,
      conversationId: args.conversationId,
      agentId: args.agentId,
      playerId: args.playerId,
      messageUuid: args.messageUuid,
      leaveConversation: args.type === 'leave',
      operationId: args.operationId,
    };

    let runtimeContext;
    let firstGuard;
    try {
      runtimeContext = await buildGMRuntimeContextForConversation(
        ctx,
        args.worldId,
        args.conversationId as GameId<'conversations'>,
      );
      firstGuard = guardGeneratedMessage({
        runtimeContext,
        agentId: args.agentId,
        conversationId: args.conversationId,
        rawOutput: text,
      });
    } catch (error) {
      /*
       * GM is a sidecar layer. If the first read-only guard pass fails,
       * fail open so the original conversation pipeline keeps working.
       */
      console.warn('[GM] Failed to guard first-pass output, falling back to raw text.', error);
      await sendAgentMessage(ctx, {
        ...dispatchArgs,
        text,
      });
      return;
    }

    if (firstGuard.shouldRegenerate && firstGuard.regenerationPrompt) {
      try {
        const regeneratedText = await completionFn(
          ctx,
          args.worldId,
          args.conversationId as GameId<'conversations'>,
          args.playerId as GameId<'players'>,
          args.otherPlayerId as GameId<'players'>,
          firstGuard.regenerationPrompt,
        );
        firstGuard.debugRecord.regeneratedOutput = regeneratedText;
        const secondGuard = guardGeneratedMessage({
          runtimeContext,
          agentId: args.agentId,
          conversationId: args.conversationId,
          rawOutput: regeneratedText,
        });
        if (secondGuard.shouldWrite) {
          await sendAgentMessage(ctx, {
            ...dispatchArgs,
            text: regeneratedText,
          });
          return;
        }
        /*
         * If the retry still fails guard review, stop here.
         * Do not loop into multiple regenerations.
         */
        await abortAgentMessage(ctx, {
          worldId: args.worldId,
          agentId: args.agentId,
          conversationId: args.conversationId,
          operationId: args.operationId,
        });
        return;
      } catch (error) {
        /*
         * Once GM has already flagged leakage strongly enough to retry,
         * never fall back to the original raw text.
         */
        console.warn('[GM] Regeneration failed after a leakage decision, aborting write.', error);
        await abortAgentMessage(ctx, {
          worldId: args.worldId,
          agentId: args.agentId,
          conversationId: args.conversationId,
          operationId: args.operationId,
        });
        return;
      }
    }

    if (!firstGuard.shouldWrite) {
      await abortAgentMessage(ctx, {
        worldId: args.worldId,
        agentId: args.agentId,
        conversationId: args.conversationId,
        operationId: args.operationId,
      });
      return;
    }

    await sendAgentMessage(ctx, {
      ...dispatchArgs,
      text,
    });
  },
});

export const agentDoSomething = internalAction({
  args: {
    worldId: v.id('worlds'),
    player: v.object(serializedPlayer),
    allPlayers: v.array(v.object(serializedPlayer)),
    playersInConversation: v.array(playerId),
    agent: v.object(serializedAgent),
    map: v.object(serializedWorldMap),
    otherFreePlayers: v.array(v.object(serializedPlayer)),
    sceneState: v.optional(v.object(serializedSceneWorldSeed)),
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { player, agent } = args;
    const map = new WorldMap(args.map);
    const now = Date.now();
    // Don't try to start a new conversation if we were just in one.
    const justLeftConversation =
      agent.lastConversation && now < agent.lastConversation + CONVERSATION_COOLDOWN;
    // Don't try again if we recently tried to find someone to invite.
    const recentlyAttemptedInvite =
      agent.lastInviteAttempt && now < agent.lastInviteAttempt + CONVERSATION_COOLDOWN;
    const recentActivity = player.activity && now < player.activity.until + ACTIVITY_COOLDOWN;
    const playersInConversation = new Set(args.playersInConversation);
    const occupiedPositions = args.allPlayers
      .filter((candidate) => candidate.id !== player.id)
      .map((candidate) => candidate.position);
    const environmentContext = getEnvironmentContextForPlayer(player, map, {
      players: args.allPlayers.map((candidate) => ({
        player: candidate,
        isInConversation: playersInConversation.has(candidate.id),
      })),
    });
    const hasSemanticMapData = map.semanticObjects.length > 0 || map.semanticAreas.length > 0;
    const semanticActionCandidates = hasSemanticMapData
      ? buildInteractionCandidates({
          player,
          environmentContext,
          sceneState: args.sceneState,
          worldMap: map,
          otherFreePlayers: args.otherFreePlayers,
          occupiedPositions,
        })
      : [];
    const decision = decideInteractionTiming({
      player: args.player,
      otherFreePlayers: args.otherFreePlayers,
      sceneState: args.sceneState,
      justLeftConversation: Boolean(justLeftConversation),
      recentlyAttemptedInvite: Boolean(recentlyAttemptedInvite),
      doingActivity: Boolean(player.activity && player.activity.until > now),
      environmentContext,
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
        .map((candidate) => ({ playerId: candidate.playerId, score: candidate.score })),
      environmentContext: decision.environmentContext,
      semanticActionCandidates: decision.semanticActionCandidates,
      semanticTriggered: decision.semanticTriggered,
    };
    if (decision.selectedSemanticAction) {
      Object.assign(interactionDecision, { selectedSemanticAction: decision.selectedSemanticAction });
    }
    const invitee =
      demoMode.disableAgentConversations || !decision.shouldInitiate
        ? undefined
        : decision.selectedPlayerId;

    let destination;
    let activity;
    const selectedSemanticAction = decision.selectedSemanticAction as SemanticActionCandidate | undefined;
    if (selectedSemanticAction?.kind === 'move_to_object' || selectedSemanticAction?.kind === 'move_to_area') {
      destination = selectedSemanticAction.destination;
    }
    if (!invitee) {
      if (selectedSemanticAction?.kind === 'wait') {
        // Space semantics explicitly chose to wait: do not replace that with wandering/activity.
      } else if (destination) {
        // Space semantics selected a concrete reachable point near an object/area.
      } else if (!player.pathfinding && (recentActivity || justLeftConversation || recentlyAttemptedInvite)) {
        destination = wanderDestination(map);
      } else if (!player.pathfinding && !recentActivity) {
        // TODO: have LLM choose the activity & emoji
        const selectedActivity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
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
      name: 'finishDoSomething',
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
